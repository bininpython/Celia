import type { Metadata } from "next";
import { PiggyBank } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { averageTicket } from "@/lib/analytics/metrics";
import { requireModule } from "@/lib/auth";
import { addDays, diffDays, formatDate, todayISO } from "@/lib/dates";
import { simulateInvestment } from "@/lib/finance/investment";
import { formatCurrency, formatPercent } from "@/lib/format";
import { INVESTMENT_KIND_LABELS, INVESTMENT_STATUS } from "@/lib/labels";
import { getFinTotals } from "@/lib/queries/finance";
import { createClient } from "@/lib/supabase/server";
import { InvestmentDialog } from "./investment-dialog";
import { InvestmentSimulator } from "./simulator";

export const metadata: Metadata = { title: "Investimentos" };

export default async function InvestmentsPage() {
  await requireModule("investimentos");
  const supabase = await createClient();
  const today = todayISO();
  const [{ data: items }, totals] = await Promise.all([
    supabase.from("investments").select("*").order("created_at", { ascending: false }),
    getFinTotals(supabase, addDays(today, -90), today),
  ]);
  const ticket = averageTicket(totals.tuitionReceived / 3, totals.payingStudents);
  const executed = (items ?? []).filter((i) => i.status === "executado");
  const totalInvested = executed.reduce((a, i) => a + Number(i.amount), 0);
  const monthlyNet = executed.reduce((a, i) => a + Number(i.expected_monthly_return) - Number(i.expected_monthly_cost), 0);

  return (
    <>
      <PageHeader title="Investimentos" description="Controle de investimentos e simulação de retorno." actions={<InvestmentDialog />} />
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total investido (executado)" value={formatCurrency(totalInvested)} icon={PiggyBank} tone="brand" />
        <StatCard label="Retorno líquido esperado/mês" value={formatCurrency(monthlyNet)} icon={PiggyBank} hint="estimativa informada" />
        <StatCard label="Planejados" value={String((items ?? []).filter((i) => i.status === "planejado").length)} icon={PiggyBank} />
      </section>
      <InvestmentSimulator averageTicket={ticket} />
      <Card className="pb-0">
        <CardHeader>
          <CardTitle>Investimentos registrados</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {!items?.length ? (
            <div className="px-5 pb-5">
              <EmptyState icon={PiggyBank} title="Nenhum investimento registrado" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investimento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Payback esperado</TableHead>
                  <TableHead className="text-right">ROI esperado</TableHead>
                  <TableHead className="text-right">Payback decorrido</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => {
                  const sim = simulateInvestment({
                    amount: Number(i.amount),
                    monthlyReturn: Number(i.expected_monthly_return),
                    monthlyCost: Number(i.expected_monthly_cost),
                    months: i.useful_life_months ?? 36,
                  });
                  const elapsed = i.invested_at && i.status === "executado" ? Math.max(0, Math.floor(diffDays(i.invested_at, today) / 30)) : null;
                  return (
                    <TableRow key={i.id}>
                      <TableCell>
                        <span className="font-medium">{i.name}</span>
                        <span className="block text-xs text-muted-foreground">{formatDate(i.invested_at)}</span>
                      </TableCell>
                      <TableCell>{INVESTMENT_KIND_LABELS[i.kind]}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(Number(i.amount))}</TableCell>
                      <TableCell className="text-right tabular-nums">{sim.paybackMonths == null ? "—" : `${sim.paybackMonths.toLocaleString("pt-BR")} m`}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatPercent(sim.roi)}</TableCell>
                      <TableCell className="text-right tabular-nums">{elapsed == null ? "—" : `${elapsed} m`}</TableCell>
                      <TableCell>
                        <StatusBadge map={INVESTMENT_STATUS} value={i.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <InvestmentDialog
                          investment={{
                            id: i.id,
                            name: i.name,
                            kind: i.kind,
                            amount: Number(i.amount),
                            invested_at: i.invested_at ?? "",
                            expected_monthly_return: Number(i.expected_monthly_return),
                            expected_monthly_cost: Number(i.expected_monthly_cost),
                            useful_life_months: i.useful_life_months ?? "",
                            status: i.status,
                            notes: i.notes ?? "",
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
    </>
  );
}
