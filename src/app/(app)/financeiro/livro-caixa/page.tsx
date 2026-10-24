import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { PeriodFilter } from "@/components/shared/url-filters";
import { buildCashbook } from "@/lib/finance/cashbook";
import { addDays, formatDate } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import { periodPresets, readPeriod } from "@/lib/period";
import { getCashBalance } from "@/lib/queries/finance";
import { requireModule } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { BookOpen, Scale, TrendingDown, TrendingUp } from "lucide-react";

export const metadata: Metadata = { title: "Livro-caixa" };

export default async function CashbookPage({ searchParams }: PageProps<"/financeiro/livro-caixa">) {
  await requireModule("financeiro");
  const sp = await searchParams;
  const { from, to } = readPeriod(sp);
  const supabase = await createClient();
  const [opening, { data: txs }] = await Promise.all([
    getCashBalance(supabase, addDays(from, -1)),
    supabase
      .from("transactions")
      .select("id, paid_date, type, amount, description, financial_categories(name)")
      .eq("status", "pago")
      .gte("paid_date", from)
      .lte("paid_date", to)
      .order("paid_date")
      .limit(5000),
  ]);
  const rows = buildCashbook(
    opening,
    (txs ?? []).map((t) => ({ id: t.id, date: t.paid_date!, type: t.type, amount: Number(t.amount), description: t.description })),
  );
  const cat = new Map((txs ?? []).map((t) => [t.id, t.financial_categories?.name ?? ""]));
  const inSum = rows.filter((r) => r.type === "receita").reduce((a, r) => a + r.amount, 0);
  const outSum = rows.filter((r) => r.type === "despesa").reduce((a, r) => a + r.amount, 0);
  const closing = rows.at(-1)?.balance ?? opening;

  return (
    <>
      <PageHeader title="Livro-caixa" description="Movimentações liquidadas com saldo acumulado." actions={<PeriodFilter from={from} to={to} presets={periodPresets()} />} />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Saldo inicial" value={formatCurrency(opening)} icon={BookOpen} />
        <StatCard label="Entradas" value={formatCurrency(inSum)} icon={TrendingUp} tone="success" />
        <StatCard label="Saídas" value={formatCurrency(outSum)} icon={TrendingDown} />
        <StatCard label="Saldo final" value={formatCurrency(closing)} icon={Scale} tone={closing >= 0 ? "brand" : "danger"} />
      </section>
      <Card className="py-0">
        <CardContent className="px-0">
          {!rows.length ? (
            <div className="p-6">
              <EmptyState icon={BookOpen} title="Sem movimentações liquidadas no período" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Histórico</TableHead>
                  <TableHead className="hidden md:table-cell">Categoria</TableHead>
                  <TableHead className="text-right">Entrada</TableHead>
                  <TableHead className="text-right">Saída</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-muted/40">
                  <TableCell>{formatDate(from)}</TableCell>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    Saldo anterior
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatCurrency(opening)}</TableCell>
                </TableRow>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDate(r.date)}</TableCell>
                    <TableCell className="max-w-80 truncate">{r.description}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{cat.get(r.id)}</TableCell>
                    <TableCell className="text-right text-success tabular-nums">{r.type === "receita" ? formatCurrency(r.amount) : ""}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.type === "despesa" ? formatCurrency(r.amount) : ""}</TableCell>
                    <TableCell className={cn("text-right font-medium tabular-nums", r.balance < 0 && "text-destructive")}>{formatCurrency(r.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>Totais do período</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(inSum)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(outSum)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(closing)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
