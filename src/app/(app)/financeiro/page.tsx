import type { Metadata } from "next";
import { ArrowDownCircle, ArrowUpCircle, CalendarClock, Landmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Pagination, PeriodFilter, SearchInput, SelectFilter } from "@/components/shared/url-filters";
import { formatDate, todayISO } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import { NATURE_LABELS, TX_STATUS } from "@/lib/labels";
import { periodPresets, readPage, readPeriod, readString } from "@/lib/period";
import { getFinTotals } from "@/lib/queries/finance";
import { createClient } from "@/lib/supabase/server";
import { cn, sanitizeSearch } from "@/lib/utils";
import { TransactionDialog, TransactionRowActions } from "./transaction-dialog";

export const metadata: Metadata = { title: "Financeiro" };
const PAGE_SIZE = 40;

export default async function FinancePage({ searchParams }: PageProps<"/financeiro">) {
  const sp = await searchParams;
  const { from, to } = readPeriod(sp);
  const tipo = readString(sp, "tipo");
  const status = readString(sp, "status");
  const categoria = readString(sp, "categoria");
  const q = sanitizeSearch(readString(sp, "q"));
  const page = readPage(sp);
  const today = todayISO();
  const supabase = await createClient();

  const [{ data: categories }, { data: suppliers }, totals] = await Promise.all([
    supabase.from("financial_categories").select("id, name, type").eq("active", true).order("name"),
    supabase.from("suppliers").select("id, name").eq("active", true).order("name"),
    getFinTotals(supabase, from, to),
  ]);

  let query = supabase
    .from("transactions")
    .select("*, financial_categories(name), suppliers(name)", { count: "exact" })
    .gte("due_date", from)
    .lte("due_date", to)
    .order("due_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (tipo === "receita" || tipo === "despesa") query = query.eq("type", tipo);
  if (status === "vencido") query = query.eq("status", "pendente").lt("due_date", today);
  else if (status && status in TX_STATUS) query = query.eq("status", status as "pendente");
  if (categoria) query = query.eq("category_id", categoria);
  if (q) query = query.ilike("description", `%${q}%`);
  const { data: txs, count } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  return (
    <>
      <PageHeader
        title="Lançamentos financeiros"
        description="Receitas, despesas, contas a pagar e a receber. Recebimentos de mensalidades entram automaticamente."
        actions={<TransactionDialog categories={categories ?? []} suppliers={suppliers ?? []} />}
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Entradas liquidadas" value={formatCurrency(totals.incomePaid)} icon={ArrowUpCircle} tone="success" />
        <StatCard label="Saídas liquidadas" value={formatCurrency(totals.expensePaid)} icon={ArrowDownCircle} />
        <StatCard label="A receber (inclui mensalidades)" value={formatCurrency(totals.incomePending)} icon={CalendarClock} />
        <StatCard label="A pagar" value={formatCurrency(totals.expensePending)} icon={Landmark} tone={totals.expensePending > 0 ? "danger" : "default"} />
      </section>
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <SearchInput placeholder="Descrição" />
        <SelectFilter param="tipo" label="Receitas e despesas" options={[{ value: "receita", label: "Receitas" }, { value: "despesa", label: "Despesas" }]} />
        <SelectFilter
          param="status"
          label="Todas as situações"
          options={[...Object.entries(TX_STATUS).map(([v, s]) => ({ value: v, label: s.label })), { value: "vencido", label: "Vencidos" }]}
        />
        <SelectFilter param="categoria" label="Todas as categorias" options={(categories ?? []).map((c) => ({ value: c.id, label: c.name }))} />
        <PeriodFilter from={from} to={to} presets={periodPresets()} />
      </div>
      <Card className="py-0">
        <CardContent className="px-0">
          {!txs?.length ? (
            <div className="p-6">
              <EmptyState icon={Landmark} title="Nenhum lançamento no período" description="Registre despesas e receitas para acompanhar o caixa." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="hidden md:table-cell">Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txs.map((t) => {
                  const overdue = t.status === "pendente" && t.due_date < today;
                  return (
                    <TableRow key={t.id} className={t.status === "cancelado" ? "text-muted-foreground line-through" : undefined}>
                      <TableCell className={cn(overdue && "text-destructive")}>
                        {formatDate(t.due_date)}
                        {t.paid_date && <span className="block text-xs text-muted-foreground">pago {formatDate(t.paid_date)}</span>}
                      </TableCell>
                      <TableCell className="max-w-72">
                        <span className="block truncate">{t.description}</span>
                        {t.suppliers?.name && <span className="block truncate text-xs text-muted-foreground">{t.suppliers.name}</span>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {t.financial_categories?.name}
                        {t.nature && <span className="block text-xs text-muted-foreground">{NATURE_LABELS[t.nature]}</span>}
                      </TableCell>
                      <TableCell className={cn("text-right font-medium tabular-nums", t.type === "receita" ? "text-success" : "text-foreground")}>
                        {t.type === "receita" ? "+" : "−"} {formatCurrency(Number(t.amount))}
                      </TableCell>
                      <TableCell>{overdue ? <StatusBadge map={{ v: { label: "Vencido", tone: "danger" } }} value="v" /> : <StatusBadge map={TX_STATUS} value={t.status} />}</TableCell>
                      <TableCell>
                        <TransactionRowActions
                          categories={categories ?? []}
                          suppliers={suppliers ?? []}
                          tx={{
                            id: t.id,
                            status: t.status,
                            payment_id: t.payment_id,
                            initial: {
                              type: t.type,
                              category_id: t.category_id,
                              supplier_id: t.supplier_id ?? "",
                              description: t.description,
                              amount: Number(t.amount),
                              competence_date: t.competence_date,
                              due_date: t.due_date,
                              paid_date: t.paid_date ?? "",
                              nature: t.nature ?? "",
                              payment_method: t.payment_method ?? "",
                              document_number: t.document_number ?? "",
                              notes: t.notes ?? "",
                              repeat_months: 1,
                            },
                          }}
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
