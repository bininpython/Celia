import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared/page-header";
import { IncomeExpenseChart } from "@/components/charts/income-expense-chart";
import { ProjectionChart } from "@/components/charts/projection-chart";
import { addMonths, endOfMonth, formatMonth, startOfMonth, todayISO } from "@/lib/dates";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getMonthly, getProjection } from "@/lib/queries/finance";
import { requireModule } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

export const metadata: Metadata = { title: "Fluxo de caixa" };
const HORIZONS = [3, 6, 12] as const;

export default async function CashFlowPage({ searchParams }: PageProps<"/financeiro/fluxo-de-caixa">) {
  await requireModule("financeiro");
  const sp = await searchParams;
  const h = Number(sp.horizonte);
  const horizon = (HORIZONS as readonly number[]).includes(h) ? h : 6;
  const today = todayISO();
  const som = startOfMonth(today);
  const supabase = await createClient();
  const [history, projection] = await Promise.all([getMonthly(supabase, addMonths(som, -11), endOfMonth(today)), getProjection(supabase, horizon)]);
  const a = projection.assumptions;

  return (
    <>
      <PageHeader
        title="Fluxo de caixa"
        description="Realizado nos últimos 12 meses e projeção para os próximos meses."
        actions={
          <div className="flex rounded-md border p-0.5" role="group" aria-label="Horizonte da projeção">
            {HORIZONS.map((x) => (
              <Link
                key={x}
                href={`?horizonte=${x}`}
                className={cn("rounded px-3 py-1 text-sm", x === horizon ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground")}
              >
                {x} meses
              </Link>
            ))}
          </div>
        }
      />
      <Alert tone="brand">
        <Info />
        <AlertTitle>Projeção é estimativa, não garantia</AlertTitle>
        <AlertDescription>
          Premissas: saldo atual de {formatCurrency(a.balance)}; receita recorrente das matrículas ativas de {formatCurrency(a.mrr)}/mês, descontada a
          inadimplência dos últimos 90 dias ({formatPercent(a.delinquencyRate)}); outras receitas e despesas pela média dos últimos {a.historyMonths} meses, ou
          pelos lançamentos já agendados quando maiores. Cenários: pessimista (−15% de receita) e otimista (+10%).
        </AlertDescription>
      </Alert>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Realizado</CardTitle>
            <CardDescription>Entradas e saídas liquidadas por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <IncomeExpenseChart data={history} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Saldo projetado — {horizon} meses</CardTitle>
            <CardDescription>Três cenários</CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectionChart data={projection.rows} />
          </CardContent>
        </Card>
      </div>
      <Card className="pb-0">
        <CardHeader>
          <CardTitle>Projeção mensal (cenário base)</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Entradas previstas</TableHead>
                <TableHead className="text-right">Saídas previstas</TableHead>
                <TableHead className="text-right">Resultado</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projection.rows.map((r) => (
                <TableRow key={r.month}>
                  <TableCell className="capitalize">{formatMonth(r.month, "long")}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(r.income)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(r.expense)}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", r.net < 0 && "text-destructive")}>{formatCurrency(r.net)}</TableCell>
                  <TableCell className={cn("text-right font-medium tabular-nums", r.balance < 0 && "text-destructive")}>{formatCurrency(r.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
