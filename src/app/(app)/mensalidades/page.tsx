import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Pagination, PeriodFilter, SearchInput, SelectFilter } from "@/components/shared/url-filters";
import { InvoiceActions } from "@/components/billing/invoice-actions";
import { requireModule } from "@/lib/auth";
import { formatDate, todayISO } from "@/lib/dates";
import { daysOverdue, displayStatus, invoiceTotal } from "@/lib/finance/invoice";
import { formatCurrency } from "@/lib/format";
import { INVOICE_STATUS } from "@/lib/labels";
import { canAccess } from "@/lib/permissions";
import { periodPresets, readPage, readPeriod, readString } from "@/lib/period";
import { getFinTotals } from "@/lib/queries/finance";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/utils";
import { GenerateInvoicesButton, NewInvoiceButton } from "./toolbar";

export const metadata: Metadata = { title: "Mensalidades" };
const PAGE_SIZE = 30;

export default async function InvoicesPage({ searchParams }: PageProps<"/mensalidades">) {
  const user = await requireModule("mensalidades");
  const sp = await searchParams;
  const situacao = readString(sp, "situacao");
  const q = sanitizeSearch(readString(sp, "q"));
  const page = readPage(sp);
  const today = todayISO();
  // "Em atraso" ignora o período: lista todos os vencidos
  const { from, to } = readPeriod(sp);
  const supabase = await createClient();

  const [{ data: gym }, totals, { data: students }] = await Promise.all([
    supabase.from("gyms").select("late_fee_percent, monthly_interest_percent").single(),
    getFinTotals(supabase, from, to),
    supabase.from("students").select("id, full_name").eq("status", "ativo").order("full_name"),
  ]);

  let query = supabase
    .from("invoices")
    .select("*, students!inner(id, full_name, enrollment_code), payments(id, amount, receipt_number, reversed_at, method)", { count: "exact" })
    .order("due_date", { ascending: situacao !== "pago" });
  if (situacao === "atrasado") query = query.eq("status", "pendente").lt("due_date", today);
  else {
    query = query.gte("due_date", from).lte("due_date", to);
    if (situacao && situacao in INVOICE_STATUS) query = query.eq("status", situacao as "pendente");
  }
  if (q) query = query.ilike("students.full_name", `%${q}%`);
  const { data: invoices, count, error } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error(error.message);

  const canReverse = canAccess(user.role, "estornar");
  return (
    <>
      <PageHeader
        title="Mensalidades"
        description="Cobranças, recebimentos, atrasos e recibos."
        actions={
          <>
            <GenerateInvoicesButton defaultMonth={today} />
            <NewInvoiceButton students={students ?? []} />
          </>
        }
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Recebido no período" value={formatCurrency(totals.tuitionReceived)} icon={CheckCircle2} tone="success" />
        <StatCard label="A receber no período" value={formatCurrency(totals.incomePending)} icon={CalendarClock} />
        <StatCard label="Em atraso (total)" value={formatCurrency(totals.overdueTotal)} icon={AlertTriangle} tone="danger" hint={`${totals.overdueInvoices} cobrança(s)`} />
        <StatCard
          label="Inadimplência no período"
          value={totals.billed > 0 ? `${((totals.overdueInPeriod / totals.billed) * 100).toFixed(1).replace(".", ",")}%` : "—"}
          icon={Wallet}
          hint="vencido e não pago ÷ faturado"
        />
      </section>
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <SearchInput placeholder="Nome do aluno" />
        <SelectFilter
          param="situacao"
          label="Todas as situações"
          options={Object.entries(INVOICE_STATUS).map(([v, s]) => ({ value: v, label: s.label }))}
        />
        {situacao !== "atrasado" && <PeriodFilter from={from} to={to} presets={periodPresets()} />}
      </div>
      <Card className="py-0">
        <CardContent className="px-0">
          {!invoices?.length ? (
            <div className="p-6">
              <EmptyState icon={Wallet} title="Nenhuma mensalidade encontrada" description="Gere as mensalidades da competência ou ajuste os filtros." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead className="hidden md:table-cell">Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((i) => {
                  const st = displayStatus(i, today);
                  const paid = i.payments.filter((p) => !p.reversed_at).reduce((a, p) => a + Number(p.amount), 0);
                  return (
                    <TableRow key={i.id}>
                      <TableCell>
                        <Link href={`/alunos/${i.students.id}`} className="font-medium hover:text-primary">
                          {i.students.full_name}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden max-w-64 truncate text-muted-foreground md:table-cell">{i.description}</TableCell>
                      <TableCell>
                        {formatDate(i.due_date)}
                        {st === "atrasado" && <span className="block text-xs text-destructive">{daysOverdue(i.due_date, today)} dias</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(invoiceTotal(i))}</TableCell>
                      <TableCell>
                        <StatusBadge map={INVOICE_STATUS} value={st} />
                      </TableCell>
                      <TableCell>
                        <InvoiceActions
                          invoice={{
                            id: i.id,
                            description: i.description,
                            due_date: i.due_date,
                            amount: Number(i.amount),
                            discount: Number(i.discount),
                            fine: Number(i.fine),
                            interest: Number(i.interest),
                            paid,
                            studentName: i.students.full_name,
                          }}
                          status={i.status}
                          payments={i.payments}
                          finePercent={Number(gym?.late_fee_percent ?? 2)}
                          interestPercent={Number(gym?.monthly_interest_percent ?? 1)}
                          canReverse={canReverse}
                        />
                      </TableCell>
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
