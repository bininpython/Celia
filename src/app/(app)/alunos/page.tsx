import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Pagination, SearchInput, SelectFilter } from "@/components/shared/url-filters";
import { requireModule } from "@/lib/auth";
import { formatDate, todayISO } from "@/lib/dates";
import { formatPhone } from "@/lib/format";
import { STUDENT_STATUS } from "@/lib/labels";
import { canAccess } from "@/lib/permissions";
import { readPage, readString } from "@/lib/period";
import { createClient } from "@/lib/supabase/server";
import { initials, sanitizeSearch } from "@/lib/utils";
import type { Enums } from "@/types/database";

export const metadata: Metadata = { title: "Alunos" };
const PAGE_SIZE = 25;

export default async function StudentsPage({ searchParams }: PageProps<"/alunos">) {
  const user = await requireModule("alunos");
  const sp = await searchParams;
  const q = sanitizeSearch(readString(sp, "q"));
  const status = readString(sp, "status") as Enums<"student_status"> | undefined;
  const situacao = readString(sp, "situacao");
  const planId = readString(sp, "plano");
  const page = readPage(sp);
  const today = todayISO();
  const supabase = await createClient();
  const seeBilling = canAccess(user.role, "mensalidades");

  const { data: plans } = await supabase.from("plans").select("id, name").order("name");

  let overdueIds: string[] | null = null;
  if (seeBilling) {
    const { data } = await supabase.from("invoices").select("student_id").eq("status", "pendente").lt("due_date", today);
    overdueIds = [...new Set((data ?? []).map((d) => d.student_id))];
  }

  let query = supabase
    .from("students")
    .select("id, full_name, enrollment_code, phone, email, status, start_date, memberships(status, plan_id, plans(name))", { count: "exact" })
    .order("full_name");
  if (q) query = query.or(`full_name.ilike.%${q}%,enrollment_code.ilike.%${q}%,cpf.ilike.%${q.replace(/\D/g, "") || "_"}%`);
  if (status && status in STUDENT_STATUS) query = query.eq("status", status);
  else query = query.neq("status", "arquivado");
  if (situacao === "inadimplente" && overdueIds) query = query.in("id", overdueIds.length ? overdueIds : ["00000000-0000-0000-0000-000000000000"]);
  if (situacao === "em_dia" && overdueIds?.length) query = query.not("id", "in", `(${overdueIds.join(",")})`);
  if (planId) {
    const { data: ms } = await supabase.from("memberships").select("student_id").eq("plan_id", planId).eq("status", "ativa");
    const ids = (ms ?? []).map((m) => m.student_id);
    query = query.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }
  const { data: students, count, error } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error(error.message);

  const ids = (students ?? []).map((s) => s.id);
  const nextDue = new Map<string, string>();
  if (seeBilling && ids.length) {
    const { data } = await supabase.from("invoices").select("student_id, due_date").in("student_id", ids).eq("status", "pendente").order("due_date");
    (data ?? []).forEach((i) => !nextDue.has(i.student_id) && nextDue.set(i.student_id, i.due_date));
  }
  const overdue = new Set(overdueIds ?? []);

  return (
    <>
      <PageHeader
        title="Alunos"
        description={`${count ?? 0} aluno(s) encontrado(s)`}
        actions={
          canAccess(user.role, "alunos_editar") && (
            <Button asChild>
              <Link href="/alunos/novo">
                <Plus /> Novo aluno
              </Link>
            </Button>
          )
        }
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <SearchInput placeholder="Nome, matrícula ou CPF" />
        <SelectFilter param="status" label="Situação: ativos e inativos" options={Object.entries(STUDENT_STATUS).map(([v, s]) => ({ value: v, label: s.label }))} />
        {seeBilling && (
          <SelectFilter
            param="situacao"
            label="Financeiro: todos"
            options={[
              { value: "inadimplente", label: "Inadimplentes" },
              { value: "em_dia", label: "Em dia" },
            ]}
          />
        )}
        <SelectFilter param="plano" label="Todos os planos" options={(plans ?? []).map((p) => ({ value: p.id, label: p.name }))} />
      </div>
      <Card className="py-0">
        <CardContent className="px-0">
          {!students?.length ? (
            <div className="p-6">
              <EmptyState icon={Users} title="Nenhum aluno encontrado" description="Ajuste os filtros ou cadastre um novo aluno." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead className="hidden md:table-cell">Contato</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Situação</TableHead>
                  {seeBilling && <TableHead>Financeiro</TableHead>}
                  {seeBilling && <TableHead className="hidden lg:table-cell">Próx. vencimento</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => {
                  const active = s.memberships.find((m) => m.status === "ativa" || m.status === "suspensa");
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link href={`/alunos/${s.id}`} className="flex items-center gap-3 font-medium hover:text-primary">
                          <Avatar>
                            <AvatarFallback>{initials(s.full_name)}</AvatarFallback>
                          </Avatar>
                          <span className="flex flex-col">
                            {s.full_name}
                            <span className="text-xs font-normal text-muted-foreground">{s.enrollment_code}</span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{formatPhone(s.phone)}</TableCell>
                      <TableCell>{active?.plans?.name ?? <span className="text-muted-foreground">Sem plano</span>}</TableCell>
                      <TableCell>
                        <StatusBadge map={STUDENT_STATUS} value={s.status} />
                      </TableCell>
                      {seeBilling && (
                        <TableCell>{overdue.has(s.id) ? <Badge tone="danger">Inadimplente</Badge> : <Badge tone="success">Em dia</Badge>}</TableCell>
                      )}
                      {seeBilling && <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDate(nextDue.get(s.id))}</TableCell>}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
    </>
  );
}
