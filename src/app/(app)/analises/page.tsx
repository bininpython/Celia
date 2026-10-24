import type { Metadata } from "next";
import { AlertOctagon, AlertTriangle, Info, Lightbulb, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { RankBars, TrendArea } from "@/components/charts/simple-charts";
import { generateInsights, type Insight } from "@/lib/analytics/insights";
import { requireModule } from "@/lib/auth";
import { addDays, addMonths, endOfMonth, formatMonth, startOfMonth, todayISO } from "@/lib/dates";
import { formatCurrency, formatPercent } from "@/lib/format";
import { PERIODICITY_LABELS } from "@/lib/labels";
import { getFinTotals, getMonthly, getRecurringRevenue } from "@/lib/queries/finance";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Inteligência financeira" };

const SEVERITY: Record<Insight["severity"], { icon: typeof Info; className: string; label: string }> = {
  critico: { icon: AlertOctagon, className: "border-red-200 dark:border-red-500/30", label: "Crítico" },
  atencao: { icon: AlertTriangle, className: "border-amber-200 dark:border-amber-500/30", label: "Atenção" },
  positivo: { icon: TrendingUp, className: "border-emerald-200 dark:border-emerald-500/30", label: "Positivo" },
  info: { icon: Info, className: "", label: "Informativo" },
};

export default async function AnalyticsPage() {
  await requireModule("analises");
  const supabase = await createClient();
  const today = todayISO();
  const som = startOfMonth(today);
  const lastClosed = addMonths(som, -1);
  // Três meses anteriores ao último mês fechado (base de comparação)
  const previousMonths = [2, 3, 4].map((i) => addMonths(som, -i));

  const [monthly, rec, counts, curDel, prevDel, lastCats, ...prevCats] = await Promise.all([
    getMonthly(supabase, addMonths(som, -11), endOfMonth(lastClosed)),
    getRecurringRevenue(supabase, addMonths(som, -11), today),
    supabase.rpc("student_counts"),
    getFinTotals(supabase, addDays(today, -90), addDays(today, -1)),
    getFinTotals(supabase, addDays(today, -180), addDays(today, -91)),
    supabase.rpc("fin_by_category", { p_from: lastClosed, p_to: endOfMonth(lastClosed), p_basis: "competencia" }),
    ...previousMonths.map((m) => supabase.rpc("fin_by_category", { p_from: m, p_to: endOfMonth(m), p_basis: "competencia" })),
  ]);

  const expenseOf = (rows: { category_name: string; type: string; total: number }[] | null, name: string) =>
    Number(rows?.find((r) => r.category_name === name && r.type === "despesa")?.total ?? 0);
  const lastExpenses = (lastCats.data ?? []).filter((r) => r.type === "despesa");
  const categoryByMonth = lastExpenses.map((c) => ({
    category: c.category_name,
    current: Number(c.total),
    averagePrevious: prevCats.reduce((a, p) => a + expenseOf(p.data, c.category_name), 0) / prevCats.length,
  }));
  const ativos = Number(counts.data?.[0]?.ativos ?? 0);
  const delinquency = {
    current: curDel.billed > 0 ? curDel.overdueInPeriod / curDel.billed : 0,
    previous: prevDel.billed > 0 ? prevDel.overdueInPeriod / prevDel.billed : 0,
  };
  const insights = generateInsights({
    monthly: monthly.map((m) => ({ month: m.month, income: m.income, expense: m.expense })),
    categoryByMonth,
    delinquency,
    activeStudents: ativos,
    plans: rec.plans.map((p) => ({ name: p.name, activeMemberships: p.active, monthlyRecurring: p.monthlyRecurring })),
  });

  const costPerStudent = monthly.slice(-6).map((m) => ({ label: formatMonth(m.month), value: ativos > 0 ? Math.round((m.expense / ativos) * 100) / 100 : 0 }));
  const revenueTrend = monthly.map((m) => ({ label: formatMonth(m.month), value: m.income }));
  const totalMrr = rec.mrr;

  return (
    <>
      <PageHeader title="Inteligência financeira" description="Análises e recomendações explicáveis a partir dos dados registrados." />
      <Alert tone="brand">
        <Lightbulb />
        <AlertDescription>
          As recomendações são estimativas geradas por regras transparentes sobre os dados do sistema — cada uma mostra os números que a originaram. Não constituem
          garantia de resultado nem substituem a análise de um contador.
        </AlertDescription>
      </Alert>

      <section aria-label="Recomendações" className="grid gap-3 md:grid-cols-2">
        {!insights.length && (
          <Card className="md:col-span-2">
            <CardContent className="text-sm text-muted-foreground">Ainda não há dados suficientes para gerar recomendações. Registre receitas e despesas por alguns meses.</CardContent>
          </Card>
        )}
        {insights.map((i) => {
          const S = SEVERITY[i.severity];
          return (
            <Card key={i.id} className={cn("gap-2 py-4", S.className)}>
              <CardHeader className="px-4">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <S.icon className={cn("size-4", i.severity === "critico" ? "text-destructive" : i.severity === "atencao" ? "text-amber-600" : "text-primary")} />
                  {i.title}
                  <span className="ml-auto text-xs font-normal text-muted-foreground">{S.label}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 px-4 text-sm">
                <p>{i.explanation}</p>
                <p className="text-muted-foreground">→ {i.recommendation}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Receita mensal</CardTitle>
            <CardDescription>Últimos 12 meses fechados (caixa)</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendArea data={revenueTrend} name="Receita" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Despesas por categoria — {formatMonth(lastClosed, "long")}</CardTitle>
            <CardDescription>Onde o dinheiro sai (competência)</CardDescription>
          </CardHeader>
          <CardContent>
            {lastExpenses.length ? (
              <RankBars data={lastExpenses.slice(0, 8).map((c) => ({ label: c.category_name, value: Number(c.total) }))} />
            ) : (
              <p className="text-sm text-muted-foreground">Sem despesas no mês.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Custo por aluno ativo</CardTitle>
            <CardDescription>Despesas do mês ÷ {ativos} alunos ativos hoje</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendArea data={costPerStudent} name="Custo por aluno" color="var(--chart-expense)" />
          </CardContent>
        </Card>
        <Card className="pb-0">
          <CardHeader>
            <CardTitle>Rentabilidade por plano</CardTitle>
            <CardDescription>Receita recorrente mensal equivalente e recebido em 12 meses</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-right">Ativos</TableHead>
                  <TableHead className="text-right">Recorrente/mês</TableHead>
                  <TableHead className="text-right">Participação</TableHead>
                  <TableHead className="text-right">Recebido 12m</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rec.plans.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.name}
                      <span className="block text-xs text-muted-foreground">{PERIODICITY_LABELS[p.periodicity]}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.active}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(p.monthlyRecurring)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPercent(totalMrr > 0 ? p.monthlyRecurring / totalMrr : 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(p.received)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
