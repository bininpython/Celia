import "server-only";
import { addDays, addMonths, diffDays, isoDateInGymTz, monthRange, parseISODate, startOfMonth, todayISO } from "@/lib/dates";
import type { Role } from "@/lib/permissions";
import { DEMO_PROFILE_IDS, DEMO_STUDENT_ID, getDemoData, type DemoDB } from "./data";

/**
 * Cliente em memória que imita o subconjunto da API do supabase-js usado no
 * sistema (consultas, relacionamentos, filtros e funções RPC). Somente leitura:
 * qualquer gravação retorna o aviso de modo demonstração.
 */
export const DEMO_WRITE_MESSAGE = "Modo demonstração: as alterações não são salvas.";

type Row = Record<string, unknown>;
type Ctx = { role: Role; db: DemoDB };

// ---------------------------------------------------------------- visibilidade por perfil (espelha o RLS)
const OWN_BY_STUDENT = new Set(["memberships", "invoices", "payments", "checkins", "workout_plans", "workout_logs", "event_attendees", "student_health"]);
const MGMT_ONLY = new Set(["financial_categories", "suppliers", "transactions", "budgets", "investments", "audit_logs", "report_exports"]);

function visible(table: string, ctx: Ctx): Row[] {
  const rows = (ctx.db[table] as Row[] | undefined) ?? [];
  const { role } = ctx;
  if (role === "admin" || role === "gerente") return rows;
  if (role === "aluno") {
    const sid = DEMO_STUDENT_ID;
    if (table === "students") return rows.filter((r) => r.id === sid);
    if (OWN_BY_STUDENT.has(table)) return rows.filter((r) => r.student_id === sid);
    if (table === "workout_divisions") {
      const plans = new Set(visible("workout_plans", ctx).map((p) => p.id));
      return rows.filter((r) => plans.has(r.plan_id));
    }
    if (table === "workout_exercises") {
      const divs = new Set(visible("workout_divisions", ctx).map((d) => d.id));
      return rows.filter((r) => divs.has(r.division_id));
    }
    if (table === "notifications") return rows.filter((r) => r.audience === "student" && r.student_id === sid);
    if (table === "events") return rows.filter((r) => (r.kind === "aula" && r.status !== "cancelado") || r.student_id === sid);
    if (table === "profiles") return rows.filter((r) => r.id === DEMO_PROFILE_IDS.aluno);
    if (["plans", "exercises", "gyms"].includes(table)) return rows;
    return [];
  }
  // equipe operacional
  if (MGMT_ONLY.has(table)) return [];
  if (table === "profiles") return rows.filter((r) => r.id === DEMO_PROFILE_IDS[role]);
  if (table === "staff") return rows.filter((r) => r.profile_id === DEMO_PROFILE_IDS[role]);
  if (table === "notifications") return rows.filter((r) => r.audience === "staff");
  if (role === "recepcionista" && ["student_health", "workout_logs"].includes(table)) return [];
  if (role === "professor" && ["invoices", "payments"].includes(table)) return [];
  return rows;
}

// ---------------------------------------------------------------- relacionamentos usados nos selects
type Rel = { kind: "one"; local: string; target: string } | { kind: "many"; foreign: string; target: string };
const REL: Record<string, Record<string, Rel>> = {
  profiles: { gyms: { kind: "one", local: "gym_id", target: "gyms" } },
  students: { memberships: { kind: "many", foreign: "student_id", target: "memberships" } },
  memberships: { plans: { kind: "one", local: "plan_id", target: "plans" } },
  invoices: { students: { kind: "one", local: "student_id", target: "students" }, payments: { kind: "many", foreign: "invoice_id", target: "payments" } },
  payments: { invoices: { kind: "one", local: "invoice_id", target: "invoices" }, students: { kind: "one", local: "student_id", target: "students" } },
  transactions: {
    financial_categories: { kind: "one", local: "category_id", target: "financial_categories" },
    suppliers: { kind: "one", local: "supplier_id", target: "suppliers" },
  },
  workout_plans: { students: { kind: "one", local: "student_id", target: "students" }, workout_divisions: { kind: "many", foreign: "plan_id", target: "workout_divisions" } },
  workout_divisions: { workout_exercises: { kind: "many", foreign: "division_id", target: "workout_exercises" } },
  workout_exercises: { exercises: { kind: "one", local: "exercise_id", target: "exercises" } },
  workout_logs: { exercises: { kind: "one", local: "exercise_id", target: "exercises" } },
  checkins: { students: { kind: "one", local: "student_id", target: "students" } },
  events: { students: { kind: "one", local: "student_id", target: "students" }, event_attendees: { kind: "many", foreign: "event_id", target: "event_attendees" } },
  event_attendees: { students: { kind: "one", local: "student_id", target: "students" }, events: { kind: "one", local: "event_id", target: "events" } },
};

type Embed = { name: string; inner: boolean; children: Embed[] };

function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function parseSelect(s: string): Embed[] {
  return splitTop(s)
    .filter((t) => t.includes("("))
    .map((t) => {
      const open = t.indexOf("(");
      const head = t.slice(0, open).trim();
      const name = head.replace(/!inner$/, "").split(":").pop()!;
      return { name, inner: head.endsWith("!inner"), children: parseSelect(t.slice(open + 1, t.lastIndexOf(")"))) };
    });
}

function attach(table: string, row: Row, embeds: Embed[], ctx: Ctx): Row | null {
  const out: Row = { ...row };
  for (const e of embeds) {
    const rel = REL[table]?.[e.name];
    if (!rel) throw new Error(`[demo] relacionamento não mapeado: ${table}.${e.name}`);
    const target = visible(rel.target, ctx);
    if (rel.kind === "one") {
      const found = target.find((t) => t.id === row[rel.local]);
      const value = found ? attach(rel.target, found, e.children, ctx) : null;
      if (e.inner && !value) return null;
      out[e.name] = value;
    } else {
      out[e.name] = target
        .filter((t) => t[rel.foreign] === row.id)
        .map((t) => attach(rel.target, t, e.children, ctx))
        .filter(Boolean);
    }
  }
  return out;
}

// ---------------------------------------------------------------- filtros
function cmp(a: unknown, b: unknown): number {
  if (typeof a === "number" || typeof b === "number") return Number(a) - Number(b);
  const sa = String(a);
  const sb = String(b);
  if (sa.includes("T") || sb.includes("T")) return Date.parse(sa) - Date.parse(sb);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}
const like = (value: unknown, pattern: string) =>
  new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".")}$`, "i").test(String(value ?? ""));

type Filter = (row: Row) => boolean;
const get = (row: Row, col: string): unknown =>
  col.split(".").reduce<unknown>((v, k) => (v && typeof v === "object" ? (v as Row)[k] : undefined), row);

function op(name: string, col: string, val: unknown): Filter {
  switch (name) {
    case "eq":
      return (r) => get(r, col) === val || (typeof val !== "object" && String(get(r, col)) === String(val));
    case "neq":
      return (r) => get(r, col) !== val;
    case "gt":
      return (r) => get(r, col) != null && cmp(get(r, col), val) > 0;
    case "gte":
      return (r) => get(r, col) != null && cmp(get(r, col), val) >= 0;
    case "lt":
      return (r) => get(r, col) != null && cmp(get(r, col), val) < 0;
    case "lte":
      return (r) => get(r, col) != null && cmp(get(r, col), val) <= 0;
    case "ilike":
      return (r) => like(get(r, col), String(val));
    case "is":
      return (r) => (val === null || val === "null" ? get(r, col) == null : get(r, col) === val);
    case "in": {
      const list = Array.isArray(val) ? val : String(val).replace(/^\(|\)$/g, "").split(",");
      return (r) => list.map(String).includes(String(get(r, col)));
    }
    default:
      throw new Error(`[demo] operador não suportado: ${name}`);
  }
}

// ---------------------------------------------------------------- construtor de consultas
class Query implements PromiseLike<{ data: unknown; error: unknown; count: number | null }> {
  private filters: Filter[] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private from = 0;
  private to = Infinity;
  private mode: "many" | "single" | "maybe" = "many";
  private embeds: Embed[] = [];
  private countMode = false;
  private head = false;
  private write = false;

  constructor(
    private table: string,
    private ctx: Ctx,
  ) {}

  select(cols = "*", opts?: { count?: string; head?: boolean }) {
    if (!this.write) {
      this.embeds = parseSelect(cols);
      this.countMode = !!opts?.count;
      this.head = !!opts?.head;
    }
    return this;
  }
  private writeOp() {
    this.write = true;
    return this;
  }
  insert() {
    return this.writeOp();
  }
  update() {
    return this.writeOp();
  }
  upsert() {
    return this.writeOp();
  }
  delete() {
    return this.writeOp();
  }
  private add(f: Filter) {
    this.filters.push(f);
    return this;
  }
  eq(c: string, v: unknown) {
    return this.add(op("eq", c, v));
  }
  neq(c: string, v: unknown) {
    return this.add(op("neq", c, v));
  }
  gt(c: string, v: unknown) {
    return this.add(op("gt", c, v));
  }
  gte(c: string, v: unknown) {
    return this.add(op("gte", c, v));
  }
  lt(c: string, v: unknown) {
    return this.add(op("lt", c, v));
  }
  lte(c: string, v: unknown) {
    return this.add(op("lte", c, v));
  }
  ilike(c: string, v: unknown) {
    return this.add(op("ilike", c, v));
  }
  is(c: string, v: unknown) {
    return this.add(op("is", c, v));
  }
  in(c: string, v: unknown[]) {
    return this.add(op("in", c, v));
  }
  not(c: string, o: string, v: unknown) {
    const f = op(o, c, v);
    return this.add((r) => !f(r));
  }
  or(expr: string) {
    const parts = expr.split(",").map((p) => {
      const [col, o, ...rest] = p.split(".");
      return op(o!, col!, rest.join("."));
    });
    return this.add((r) => parts.some((f) => f(r)));
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push({ col, asc: opts?.ascending !== false });
    return this;
  }
  range(from: number, to: number) {
    this.from = from;
    this.to = to;
    return this;
  }
  limit(n: number) {
    this.to = this.from + n - 1;
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this;
  }

  private run() {
    if (this.write) {
      if (this.table === "report_exports") return { data: null, error: null, count: null };
      return { data: null, error: { message: DEMO_WRITE_MESSAGE, code: "P0001" }, count: null };
    }
    let rows = visible(this.table, this.ctx)
      .map((r) => attach(this.table, r, this.embeds, this.ctx))
      .filter((r): r is Row => !!r)
      .filter((r) => this.filters.every((f) => f(r)));
    for (const o of [...this.orders].reverse()) {
      rows = [...rows].sort((a, b) => {
        const va = a[o.col];
        const vb = b[o.col];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        const c = typeof va === "boolean" ? Number(va) - Number(vb) : cmp(va, vb);
        return o.asc ? c : -c;
      });
    }
    const count = this.countMode ? rows.length : null;
    rows = rows.slice(this.from, this.to === Infinity ? undefined : this.to + 1);
    if (this.head) return { data: null, error: null, count };
    if (this.mode === "single") {
      return rows.length === 1
        ? { data: rows[0], error: null, count }
        : { data: null, error: { message: "Registro não encontrado", code: "PGRST116" }, count };
    }
    if (this.mode === "maybe") return { data: rows[0] ?? null, error: null, count };
    return { data: rows, error: null, count };
  }

  then<A = { data: unknown; error: unknown; count: number | null }, B = never>(
    ok?: ((v: { data: unknown; error: unknown; count: number | null }) => A | PromiseLike<A>) | null,
    fail?: ((e: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    try {
      return Promise.resolve(this.run()).then(ok, fail);
    } catch (e) {
      return Promise.reject(e).then(ok, fail);
    }
  }
}

// ---------------------------------------------------------------- funções RPC (mesma semântica das funções SQL)
const num = (v: unknown) => Number(v ?? 0);
const total = (i: Row) => Math.round((num(i.amount) - num(i.discount) + num(i.fine) + num(i.interest)) * 100) / 100;
const sumBy = <T,>(xs: T[], f: (x: T) => number) => Math.round(xs.reduce((a, x) => a + f(x), 0) * 100) / 100;
const inMonth = (d: unknown, m: string) => typeof d === "string" && d.slice(0, 7) === m.slice(0, 7);
const between = (d: unknown, a: string, b: string) => typeof d === "string" && d.slice(0, 10) >= a && d.slice(0, 10) <= b;
const localDay = (t: unknown) => isoDateInGymTz(String(t));

function rpc(name: string, args: Record<string, unknown>, ctx: Ctx): unknown {
  const v = (t: string) => visible(t, ctx);
  const today = todayISO();
  const from = String(args.p_from ?? "");
  const to = String(args.p_to ?? "");
  const tx = v("transactions");
  const inv = v("invoices");
  switch (name) {
    case "student_counts": {
      const s = v("students");
      const overdue = new Set(inv.filter((i) => i.status === "pendente" && String(i.due_date) < today).map((i) => i.student_id));
      return [
        {
          ativos: s.filter((x) => x.status === "ativo").length,
          suspensos: s.filter((x) => x.status === "suspenso").length,
          inativos: s.filter((x) => x.status === "inativo").length,
          arquivados: s.filter((x) => x.status === "arquivado").length,
          inadimplentes: s.filter((x) => x.status !== "arquivado" && overdue.has(x.id)).length,
        },
      ];
    }
    case "active_members_at": {
      const d = String(args.p_date);
      return new Set(
        v("memberships")
          .filter((m) => String(m.start_date) <= d && (!m.end_date || String(m.end_date) >= d) && (!m.canceled_at || localDay(m.canceled_at) > d))
          .map((m) => m.student_id),
      ).size;
    }
    case "fin_monthly":
      return monthRange(from, to).map((m) => ({
        month: m,
        income_paid: sumBy(tx.filter((t) => t.type === "receita" && t.status === "pago" && inMonth(t.paid_date, m)), (t) => num(t.amount)),
        expense_paid: sumBy(tx.filter((t) => t.type === "despesa" && t.status === "pago" && inMonth(t.paid_date, m)), (t) => num(t.amount)),
        income_pending:
          sumBy(tx.filter((t) => t.type === "receita" && t.status === "pendente" && inMonth(t.due_date, m)), (t) => num(t.amount)) +
          sumBy(inv.filter((i) => i.status === "pendente" && inMonth(i.due_date, m)), total),
        expense_pending: sumBy(tx.filter((t) => t.type === "despesa" && t.status === "pendente" && inMonth(t.due_date, m)), (t) => num(t.amount)),
        income_competence: sumBy(tx.filter((t) => t.type === "receita" && t.status !== "cancelado" && inMonth(t.competence_date, m)), (t) => num(t.amount)),
        expense_competence: sumBy(tx.filter((t) => t.type === "despesa" && t.status !== "cancelado" && inMonth(t.competence_date, m)), (t) => num(t.amount)),
      }));
    case "fin_totals": {
      const pays = v("payments").filter((p) => !p.reversed_at && between(localDay(p.paid_at), from, to));
      const yesterday = addDays(today, -1);
      return [
        {
          income_paid: sumBy(tx.filter((t) => t.type === "receita" && t.status === "pago" && between(t.paid_date, from, to)), (t) => num(t.amount)),
          expense_paid: sumBy(tx.filter((t) => t.type === "despesa" && t.status === "pago" && between(t.paid_date, from, to)), (t) => num(t.amount)),
          income_pending:
            sumBy(tx.filter((t) => t.type === "receita" && t.status === "pendente" && between(t.due_date, from, to)), (t) => num(t.amount)) +
            sumBy(inv.filter((i) => i.status === "pendente" && between(i.due_date, from, to)), total),
          expense_pending: sumBy(tx.filter((t) => t.type === "despesa" && t.status === "pendente" && between(t.due_date, from, to)), (t) => num(t.amount)),
          tuition_received: sumBy(pays, (p) => num(p.amount)),
          paying_students: new Set(pays.map((p) => p.student_id)).size,
          billed_amount: sumBy(inv.filter((i) => (i.status === "pendente" || i.status === "pago") && between(i.due_date, from, to)), total),
          overdue_in_period: sumBy(inv.filter((i) => i.status === "pendente" && between(i.due_date, from, to < yesterday ? to : yesterday)), total),
          overdue_total: sumBy(inv.filter((i) => i.status === "pendente" && String(i.due_date) < today), total),
          overdue_invoices: inv.filter((i) => i.status === "pendente" && String(i.due_date) < today).length,
        },
      ];
    }
    case "fin_by_category": {
      const basis = args.p_basis === "competencia" ? "competencia" : "caixa";
      const rows = tx.filter((t) =>
        basis === "competencia" ? t.status !== "cancelado" && between(t.competence_date, from, to) : t.status === "pago" && between(t.paid_date, from, to),
      );
      return v("financial_categories")
        .map((c) => ({
          category_id: c.id, category_name: c.name, type: c.type, nature: c.nature, dre_group: c.dre_group, color: c.color,
          total: sumBy(rows.filter((t) => t.category_id === c.id), (t) => num(t.amount)),
        }))
        .filter((c) => c.total > 0)
        .sort((a, b) => b.total - a.total);
    }
    case "cash_balance": {
      const gym = v("gyms")[0];
      if (!gym) return 0;
      const at = String(args.p_at ?? today);
      const paid = tx.filter((t) => t.status === "pago" && String(t.paid_date) >= String(gym.opening_balance_date) && String(t.paid_date) <= at);
      return num(gym.opening_balance) + sumBy(paid, (t) => (t.type === "receita" ? num(t.amount) : -num(t.amount)));
    }
    case "budget_vs_actual": {
      const m = startOfMonth(String(args.p_month));
      return v("financial_categories").map((c) => ({
        category_id: c.id, category_name: c.name, type: c.type,
        budget: num(v("budgets").find((b) => b.category_id === c.id && b.month === m)?.amount),
        actual: sumBy(tx.filter((t) => t.category_id === c.id && t.status !== "cancelado" && inMonth(t.competence_date, m)), (t) => num(t.amount)),
      }));
    }
    case "plan_stats": {
      const ms = v("memberships");
      const pays = v("payments").filter((p) => !p.reversed_at && between(localDay(p.paid_at), from, to));
      return v("plans")
        .map((p) => {
          const active = ms.filter((m) => m.plan_id === p.id && m.status === "ativa");
          const mids = new Set(ms.filter((m) => m.plan_id === p.id).map((m) => m.id));
          const invIds = new Set(inv.filter((i) => mids.has(i.membership_id)).map((i) => i.id));
          return {
            plan_id: p.id, plan_name: p.name, periodicity: p.periodicity, price: p.price, duration_months: p.duration_months,
            active_memberships: active.length,
            monthly_recurring: sumBy(active, (m) => (num(m.price) - num(m.discount)) / num(p.duration_months)),
            received: sumBy(pays.filter((x) => invIds.has(x.invoice_id)), (x) => num(x.amount)),
          };
        })
        .sort((a, b) => num(a.price) - num(b.price));
    }
    case "checkins_daily": {
      const by = new Map<string, Row[]>();
      v("checkins").forEach((c) => {
        const d = localDay(c.checked_in_at);
        if (d >= from && d <= to) by.set(d, [...(by.get(d) ?? []), c]);
      });
      return [...by.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, list]) => ({ day, total: list.length, unique_students: new Set(list.map((c) => c.student_id)).size }));
    }
    case "checkins_heatmap": {
      const by = new Map<string, number>();
      v("checkins").forEach((c) => {
        const d = localDay(c.checked_in_at);
        if (d < from || d > to) return;
        const local = new Date(new Date(String(c.checked_in_at)).toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
        const key = `${local.getDay()}|${local.getHours()}`;
        by.set(key, (by.get(key) ?? 0) + 1);
      });
      return [...by.entries()].map(([k, total]) => ({ dow: Number(k.split("|")[0]), hour: Number(k.split("|")[1]), total }));
    }
    case "student_attendance": {
      const days = num(args.p_days ?? 30);
      const since = Date.now() - days * 86_400_000;
      const cs = v("checkins");
      return v("students")
        .filter((s) => s.status === "ativo")
        .map((s) => {
          const mine = cs.filter((c) => c.student_id === s.id);
          const last = mine.reduce<string | null>((a, c) => (!a || String(c.checked_in_at) > a ? String(c.checked_in_at) : a), null);
          return {
            student_id: s.id, full_name: s.full_name, status: s.status, phone: s.phone, last_checkin: last,
            checkins_period: mine.filter((c) => Date.parse(String(c.checked_in_at)) > since).length,
            days_since_last: diffDays(last ? localDay(last) : String(s.start_date), today),
          };
        });
    }
    case "enrollments_monthly":
      return monthRange(from, to).map((m) => ({
        month: m,
        new_students: v("students").filter((s) => inMonth(s.start_date, m)).length,
        cancellations: v("memberships").filter((x) => x.status === "cancelada" && inMonth(localDay(x.canceled_at), m)).length,
      }));
    default:
      // Funções que alteram dados
      return { __error: DEMO_WRITE_MESSAGE };
  }
}

export function createDemoClient(role: Role) {
  const ctx: Ctx = { role, db: getDemoData() };
  return {
    from: (table: string) => new Query(table, ctx),
    rpc: async (name: string, args: Record<string, unknown> = {}) => {
      const data = rpc(name, args, ctx);
      if (data && typeof data === "object" && "__error" in (data as Row)) return { data: null, error: { message: DEMO_WRITE_MESSAGE, code: "P0001" } };
      return { data, error: null };
    },
    storage: {
      from: () => ({
        createSignedUrl: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
        upload: async () => ({ data: null, error: { message: DEMO_WRITE_MESSAGE } }),
        remove: async () => ({ data: null, error: null }),
      }),
    },
    auth: {
      getUser: async () => ({ data: { user: { id: DEMO_PROFILE_IDS[role], email: null } }, error: null }),
      getClaims: async () => ({ data: { claims: { sub: DEMO_PROFILE_IDS[role] } }, error: null }),
      signOut: async () => ({ error: null }),
    },
  };
}

// utilitários reexportados para testes
export const __test = { parseSelect, cmp, like, monthsAgo: (n: number) => addMonths(todayISO(), -n), parseISODate };
