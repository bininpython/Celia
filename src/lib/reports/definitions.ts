import "server-only";
import { formatDate, todayISO, diffDays } from "@/lib/dates";
import { buildDre } from "@/lib/finance/dre";
import { invoiceTotal } from "@/lib/finance/invoice";
import { maskCpf } from "@/lib/format";
import {
  CHECKIN_METHOD_LABELS, INVOICE_STATUS, PAYMENT_METHOD_LABELS, ROLE_LABELS, STUDENT_STATUS, TX_STATUS, TX_TYPE_LABELS,
} from "@/lib/labels";
import type { Module } from "@/lib/permissions";
import { getProjection } from "@/lib/queries/finance";
import type { ServerSupabase } from "@/lib/supabase/server";
import { round2 } from "@/lib/utils";
import type { Report } from "./types";

type Ctx = { supabase: ServerSupabase; from: string; to: string };
type Def = { label: string; description: string; group: "Financeiro" | "Operacional" | "Treinos"; module: Module; usesPeriod: boolean; build: (c: Ctx) => Promise<Report> };

const period = (from: string, to: string) => `${formatDate(from)} a ${formatDate(to)}`;
const must = <T,>(r: { data: T | null; error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
};

export const REPORTS = {
  lancamentos: {
    label: "Lançamentos financeiros",
    description: "Receitas e despesas por vencimento, com situação.",
    group: "Financeiro",
    module: "relatorios",
    usesPeriod: true,
    async build({ supabase, from, to }) {
      const data = must(
        await supabase
          .from("transactions")
          .select("due_date, paid_date, type, description, amount, status, financial_categories(name), suppliers(name)")
          .gte("due_date", from)
          .lte("due_date", to)
          .order("due_date")
          .limit(10000),
      );
      const rows = data.map((t) => ({
        due_date: t.due_date,
        paid_date: t.paid_date,
        type: TX_TYPE_LABELS[t.type],
        category: t.financial_categories?.name ?? "",
        description: t.description,
        supplier: t.suppliers?.name ?? "",
        status: TX_STATUS[t.status].label,
        amount: t.type === "despesa" ? -Number(t.amount) : Number(t.amount),
      }));
      return {
        title: "Lançamentos financeiros",
        subtitle: period(from, to),
        columns: [
          { key: "due_date", label: "Vencimento", type: "date" },
          { key: "paid_date", label: "Pagamento", type: "date" },
          { key: "type", label: "Tipo", width: 10 },
          { key: "category", label: "Categoria", width: 24 },
          { key: "description", label: "Descrição", width: 40 },
          { key: "supplier", label: "Fornecedor", width: 22 },
          { key: "status", label: "Situação", width: 12 },
          { key: "amount", label: "Valor", type: "currency" },
        ],
        rows,
        totals: { description: "Saldo (excluídos cancelados)", amount: round2(rows.filter((r) => r.status !== "Cancelado").reduce((a, r) => a + r.amount, 0)) },
      };
    },
  },
  dre: {
    label: "DRE gerencial",
    description: "Resultado do período em regime de caixa.",
    group: "Financeiro",
    module: "relatorios",
    usesPeriod: true,
    async build({ supabase, from, to }) {
      const data = must(await supabase.rpc("fin_by_category", { p_from: from, p_to: to, p_basis: "caixa" }));
      const dre = buildDre(data.map((r) => ({ ...r, total: Number(r.total) })));
      const rows = dre.lines.flatMap((l) => [
        { line: l.label, value: l.value },
        ...(l.details ?? []).map((d) => ({ line: `    ${d.label}`, value: d.value })),
      ]);
      return {
        title: "DRE gerencial",
        subtitle: `${period(from, to)} · regime de caixa`,
        columns: [
          { key: "line", label: "Conta", width: 48 },
          { key: "value", label: "Valor", type: "currency" },
        ],
        rows,
      };
    },
  },
  recebimentos: {
    label: "Recebimentos de mensalidades",
    description: "Pagamentos registrados por data, forma e recibo.",
    group: "Financeiro",
    module: "relatorios",
    usesPeriod: true,
    async build({ supabase, from, to }) {
      const data = must(
        await supabase
          .from("payments")
          .select("paid_at, receipt_number, amount, method, reversed_at, students(full_name), invoices(description)")
          .gte("paid_at", `${from}T00:00:00-03:00`)
          .lte("paid_at", `${to}T23:59:59-03:00`)
          .order("paid_at")
          .limit(10000),
      );
      const rows = data.map((p) => ({
        paid_at: p.paid_at,
        receipt: p.receipt_number,
        student: p.students?.full_name ?? "",
        description: p.invoices?.description ?? "",
        method: PAYMENT_METHOD_LABELS[p.method],
        situation: p.reversed_at ? "Estornado" : "Válido",
        amount: Number(p.amount),
      }));
      return {
        title: "Recebimentos de mensalidades",
        subtitle: period(from, to),
        columns: [
          { key: "paid_at", label: "Data", type: "datetime", width: 18 },
          { key: "receipt", label: "Recibo", width: 10 },
          { key: "student", label: "Aluno", width: 30 },
          { key: "description", label: "Referente a", width: 34 },
          { key: "method", label: "Forma", width: 18 },
          { key: "situation", label: "Situação", width: 12 },
          { key: "amount", label: "Valor", type: "currency" },
        ],
        rows,
        totals: { student: "Total válido", amount: round2(rows.filter((r) => r.situation === "Válido").reduce((a, r) => a + r.amount, 0)) },
      };
    },
  },
  inadimplencia: {
    label: "Inadimplência",
    description: "Mensalidades vencidas e não pagas (posição atual).",
    group: "Financeiro",
    module: "relatorios",
    usesPeriod: false,
    async build({ supabase }) {
      const today = todayISO();
      const data = must(
        await supabase
          .from("invoices")
          .select("due_date, description, amount, discount, fine, interest, status, students(full_name, phone, enrollment_code)")
          .eq("status", "pendente")
          .lt("due_date", today)
          .order("due_date")
          .limit(10000),
      );
      const rows = data.map((i) => ({
        student: i.students?.full_name ?? "",
        code: i.students?.enrollment_code ?? "",
        phone: i.students?.phone ?? "",
        description: i.description,
        due_date: i.due_date,
        days: diffDays(i.due_date, today),
        amount: invoiceTotal(i),
      }));
      return {
        title: "Relatório de inadimplência",
        subtitle: `Posição em ${formatDate(today)} · ${INVOICE_STATUS.atrasado.label}`,
        columns: [
          { key: "student", label: "Aluno", width: 30 },
          { key: "code", label: "Matrícula", width: 12 },
          { key: "phone", label: "Telefone", width: 16 },
          { key: "description", label: "Cobrança", width: 32 },
          { key: "due_date", label: "Vencimento", type: "date" },
          { key: "days", label: "Dias em atraso", type: "number" },
          { key: "amount", label: "Valor", type: "currency" },
        ],
        rows,
        totals: { student: `${new Set(rows.map((r) => r.code)).size} aluno(s)`, amount: round2(rows.reduce((a, r) => a + r.amount, 0)) },
      };
    },
  },
  previsao: {
    label: "Previsão de receita e caixa (12 meses)",
    description: "Projeção estimada a partir das matrículas ativas e do histórico.",
    group: "Financeiro",
    module: "relatorios",
    usesPeriod: false,
    async build({ supabase }) {
      const p = await getProjection(supabase, 12);
      return {
        title: "Previsão de receita e caixa",
        subtitle: "Estimativa — não constitui garantia de resultado",
        columns: [
          { key: "month", label: "Mês", type: "date" },
          { key: "income", label: "Entradas previstas", type: "currency" },
          { key: "expense", label: "Saídas previstas", type: "currency" },
          { key: "net", label: "Resultado", type: "currency" },
          { key: "balance", label: "Saldo (base)", type: "currency" },
          { key: "pessimista", label: "Saldo pessimista", type: "currency" },
          { key: "otimista", label: "Saldo otimista", type: "currency" },
        ],
        rows: p.rows,
      };
    },
  },
  alunos: {
    label: "Alunos",
    description: "Cadastro com situação, plano e data de entrada (CPF mascarado).",
    group: "Operacional",
    module: "relatorios",
    usesPeriod: false,
    async build({ supabase }) {
      const data = must(
        await supabase
          .from("students")
          .select("full_name, enrollment_code, cpf, phone, email, start_date, status, memberships(status, plans(name))")
          .neq("status", "arquivado")
          .order("full_name")
          .limit(10000),
      );
      return {
        title: "Relatório de alunos",
        subtitle: `Posição em ${formatDate(todayISO())}`,
        columns: [
          { key: "name", label: "Aluno", width: 30 },
          { key: "code", label: "Matrícula", width: 12 },
          { key: "cpf", label: "CPF", width: 16 },
          { key: "phone", label: "Telefone", width: 16 },
          { key: "plan", label: "Plano", width: 16 },
          { key: "start", label: "Entrada", type: "date" },
          { key: "status", label: "Situação", width: 12 },
        ],
        rows: data.map((s) => ({
          name: s.full_name,
          code: s.enrollment_code,
          cpf: maskCpf(s.cpf),
          phone: s.phone ?? "",
          plan: s.memberships.find((m) => m.status === "ativa")?.plans?.name ?? "",
          start: s.start_date,
          status: STUDENT_STATUS[s.status].label,
        })),
      };
    },
  },
  frequencia: {
    label: "Frequência por aluno",
    description: "Check-ins no período e último acesso.",
    group: "Operacional",
    module: "relatorios",
    usesPeriod: true,
    async build({ supabase, from, to }) {
      const data = must(
        await supabase
          .from("checkins")
          .select("checked_in_at, method, student_id, students(full_name, enrollment_code)")
          .gte("checked_in_at", `${from}T00:00:00-03:00`)
          .lte("checked_in_at", `${to}T23:59:59-03:00`)
          .order("checked_in_at")
          .limit(50000),
      );
      const by = new Map<string, { name: string; code: string; count: number; last: string; methods: Set<string> }>();
      data.forEach((c) => {
        const cur = by.get(c.student_id) ?? { name: c.students?.full_name ?? "", code: c.students?.enrollment_code ?? "", count: 0, last: c.checked_in_at, methods: new Set() };
        cur.count++;
        cur.last = c.checked_in_at;
        cur.methods.add(CHECKIN_METHOD_LABELS[c.method]);
        by.set(c.student_id, cur);
      });
      const weeks = Math.max(1, (diffDays(from, to) + 1) / 7);
      return {
        title: "Frequência por aluno",
        subtitle: period(from, to),
        columns: [
          { key: "name", label: "Aluno", width: 30 },
          { key: "code", label: "Matrícula", width: 12 },
          { key: "count", label: "Check-ins", type: "number" },
          { key: "weekly", label: "Média semanal", type: "number" },
          { key: "last", label: "Último acesso", type: "datetime", width: 18 },
          { key: "methods", label: "Formas", width: 24 },
        ],
        rows: [...by.values()]
          .sort((a, b) => b.count - a.count)
          .map((r) => ({ name: r.name, code: r.code, count: r.count, weekly: round2(r.count / weeks), last: r.last, methods: [...r.methods].join(", ") })),
        totals: { name: "Total", count: data.length },
      };
    },
  },
  equipe: {
    label: "Equipe",
    description: "Funcionários, funções e situação.",
    group: "Operacional",
    module: "relatorios",
    usesPeriod: false,
    async build({ supabase }) {
      const data = must(await supabase.from("staff").select("full_name, role, position, phone, email, hire_date, active").order("full_name"));
      return {
        title: "Equipe",
        subtitle: `Posição em ${formatDate(todayISO())}`,
        columns: [
          { key: "name", label: "Nome", width: 30 },
          { key: "role", label: "Perfil", width: 16 },
          { key: "position", label: "Cargo", width: 20 },
          { key: "phone", label: "Telefone", width: 16 },
          { key: "hire", label: "Admissão", type: "date" },
          { key: "active", label: "Situação", width: 10 },
        ],
        rows: data.map((s) => ({ name: s.full_name, role: ROLE_LABELS[s.role], position: s.position ?? "", phone: s.phone ?? "", hire: s.hire_date, active: s.active ? "Ativo" : "Inativo" })),
      };
    },
  },
  treinos: {
    label: "Fichas de treino ativas",
    description: "Alunos com ficha ativa, divisões e data de revisão.",
    group: "Treinos",
    module: "relatorios",
    usesPeriod: false,
    async build({ supabase }) {
      const data = must(
        await supabase
          .from("workout_plans")
          .select("title, start_date, end_date, students(full_name), workout_divisions(label)")
          .eq("active", true)
          .order("start_date")
          .limit(10000),
      );
      return {
        title: "Fichas de treino ativas",
        subtitle: `Posição em ${formatDate(todayISO())}`,
        columns: [
          { key: "student", label: "Aluno", width: 30 },
          { key: "title", label: "Ficha", width: 28 },
          { key: "divisions", label: "Divisões", width: 14 },
          { key: "start", label: "Início", type: "date" },
          { key: "end", label: "Revisão", type: "date" },
        ],
        rows: data.map((w) => ({
          student: w.students?.full_name ?? "",
          title: w.title,
          divisions: w.workout_divisions.map((d) => d.label).join(", "),
          start: w.start_date,
          end: w.end_date,
        })),
      };
    },
  },
} satisfies Record<string, Def>;

export type ReportKey = keyof typeof REPORTS;
export const isReportKey = (k: string): k is ReportKey => k in REPORTS;
