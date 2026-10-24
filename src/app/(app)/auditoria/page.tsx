import type { Metadata } from "next";
import { FileClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination, PeriodFilter, SelectFilter } from "@/components/shared/url-filters";
import { requireModule } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { ROLE_LABELS } from "@/lib/labels";
import { periodPresets, readPage, readPeriod, readString } from "@/lib/period";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const metadata: Metadata = { title: "Auditoria" };
const PAGE_SIZE = 50;

const TABLES: Record<string, string> = {
  students: "Alunos",
  student_health: "Saúde",
  memberships: "Matrículas",
  invoices: "Mensalidades",
  payments: "Pagamentos",
  transactions: "Lançamentos",
  plans: "Planos",
  staff: "Equipe",
  profiles: "Usuários",
  gyms: "Academia",
  investments: "Investimentos",
  budgets: "Orçamento",
  suppliers: "Fornecedores",
  financial_categories: "Categorias",
  workout_plans: "Fichas",
  events: "Agenda",
};
const ACTIONS: Record<string, { label: string; tone: "success" | "warning" | "danger" }> = {
  INSERT: { label: "Inclusão", tone: "success" },
  UPDATE: { label: "Alteração", tone: "warning" },
  DELETE: { label: "Exclusão", tone: "danger" },
};
const IGNORED = new Set(["updated_at", "created_at", "gym_id", "id"]);

function changes(oldData: Json | null, newData: Json | null): string {
  const o = (oldData ?? {}) as Record<string, unknown>;
  const n = (newData ?? {}) as Record<string, unknown>;
  if (!oldData && !newData) return "Conteúdo protegido (dado sensível)";
  if (!oldData) return Object.keys(n).filter((k) => !IGNORED.has(k) && n[k] != null).slice(0, 6).map((k) => `${k}: ${String(n[k]).slice(0, 40)}`).join(" · ");
  if (!newData) return "Registro removido";
  const diff = Object.keys(n).filter((k) => !IGNORED.has(k) && JSON.stringify(o[k]) !== JSON.stringify(n[k]));
  return diff.map((k) => `${k}: ${String(o[k] ?? "∅").slice(0, 30)} → ${String(n[k] ?? "∅").slice(0, 30)}`).join(" · ") || "Sem alteração de conteúdo";
}

export default async function AuditPage({ searchParams }: PageProps<"/auditoria">) {
  await requireModule("auditoria");
  const sp = await searchParams;
  const { from, to } = readPeriod(sp);
  const table = readString(sp, "tabela");
  const act = readString(sp, "acao");
  const page = readPage(sp);
  const supabase = await createClient();
  let q = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .gte("created_at", `${from}T00:00:00-03:00`)
    .lte("created_at", `${to}T23:59:59-03:00`)
    .order("created_at", { ascending: false });
  if (table && table in TABLES) q = q.eq("table_name", table);
  if (act && act in ACTIONS) q = q.eq("action", act);
  const [{ data: logs, count }, { data: profiles }] = await Promise.all([q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1), supabase.from("profiles").select("id, full_name")]);
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (
    <>
      <PageHeader title="Trilha de auditoria" description="Registro automático de inclusões, alterações e exclusões feitas no banco de dados." actions={<PeriodFilter from={from} to={to} presets={periodPresets()} />} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <SelectFilter param="tabela" label="Todas as áreas" options={Object.entries(TABLES).map(([value, label]) => ({ value, label }))} />
        <SelectFilter param="acao" label="Todas as ações" options={Object.entries(ACTIONS).map(([value, a]) => ({ value, label: a.label }))} />
      </div>
      <Card className="py-0">
        <CardContent className="px-0">
          {!logs?.length ? (
            <div className="p-6">
              <EmptyState icon={FileClock} title="Nenhum registro no período" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{formatDateTime(l.created_at)}</TableCell>
                    <TableCell>
                      {l.actor_id ? (names.get(l.actor_id) ?? "Usuário removido") : "Sistema"}
                      {l.actor_role && <span className="block text-xs text-muted-foreground">{ROLE_LABELS[l.actor_role]}</span>}
                    </TableCell>
                    <TableCell>{TABLES[l.table_name] ?? l.table_name}</TableCell>
                    <TableCell>
                      <Badge tone={ACTIONS[l.action]?.tone}>{ACTIONS[l.action]?.label ?? l.action}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[28rem] truncate text-xs text-muted-foreground" title={changes(l.old_data, l.new_data)}>
                      {changes(l.old_data, l.new_data)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
    </>
  );
}
