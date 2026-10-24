import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle, ArrowRight, Banknote, CalendarClock, CircleDollarSign, Gauge, Receipt, TrendingDown, TrendingUp,
  UserCheck, UserMinus, UserPlus, Users, UserX, Wallet,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { PeriodFilter } from "@/components/shared/url-filters";
import { IncomeExpenseChart, YearComparisonChart } from "@/components/charts/income-expense-chart";
import { ProjectionChart } from "@/components/charts/projection-chart";
import { averageTicket, percentChange, retentionRate, weeklyFrequency } from "@/lib/analytics/metrics";
import { requireModule } from "@/lib/auth";
import { addDays, addMonths, diffDays, endOfMonth, formatMonth, startOfMonth, todayISO } from "@/lib/dates";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { canAccess } from "@/lib/permissions";
import { periodPresets, readPeriod } from "@/lib/period";
import { getCashBalance, getFinTotals, getMonthly, getProjection, previousPeriod } from "@/lib/queries/finance";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

type Alert = { tone: "danger" | "warning" | "info"; text: string; href: string };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireModule("dashboard");
  const sp = await searchParams;
  const { from, to } = readPeriod(sp);
  const prev = previousPeriod(from, to);
  const today = todayISO();
  const supabase = await createClient();
  const showFinance = canAccess(user.role, "financeiro");
  const showBilling = canAccess(user.role, "mensalidades");

  const head = { count: "exact", head: true } as const;

  const [counts, newStudents, prevNew, cancels, prevCancels, checkins, activeAtStart, gym] = await Promise.all([
    supabase.rpc("student_counts"),
    supabase.from("students").select("id", head).gte("start_date", from).lte("start_date", to),
    supabase.from("students").select("id", head).gte("start_date", prev.from).lte("start_date", prev.to),
    supabase.from("memberships").select("id", head).eq("status", "cancelada").gte("canceled_at", `${from}T00:00:00-03:00`).lte("canceled_at", `${to}T23:59:59-03:00`),
    supabase.from("memberships").select("id", head).eq("status", "cancelada").gte("canceled_at", `${prev.from}T00:00:00-03:00`).lte("canceled_at", `${prev.to}T23:59:59-03:00`),
    supabase.from("checkins").select("id", head).gte("checked_in_at", `${from}T00:00:00-03:00`).lte("checked_in_at", `${to}T23:59:59-03:00`),
    supabase.rpc("active_members_at", { p_date: from }),
    supabase.from("gyms").select("due_alert_days, absence_alert_days").single(),
  ]);

  const c = counts.data?.[0];
  const ativos = Number(c?.ativos ?? 0);
  const days = Math.min(diffDays(from, to) + 1, diffDays(from, today) + 1);
  const retention = retentionRate(Number(activeAtStart.data ?? 0), cancels.count ?? 0);
  const freq = weeklyFrequency(checkins.count ?? 0, ativos, Math.max(1, days));

  // Financeiro
  const som = startOfMonth(to);
  const [totals, prevTotals, monthly, yearly, balance, projection] = showFinance
    ? await Promise.all([
        getFinTotals(supabase, from, to),
        getFinTotals(supabase, prev.from, prev.to),
        getMonthly(supabase, addMonths(som, -11), endOfMonth(to)),
        getMonthly(supabase, `${Number(to.slice(0, 4)) - 1}-01-01`, `${to.slice(0, 4)}-12-31`),
        getCashBalance(supabase, today),
        getProjection(supabase, 6),
      ])
    : showBilling
      ? [await getFinTotals(supabase, from, to), null, null, null, null, null]
      : [null, null, null, null, null, null];

  const ticket = totals ? averageTicket(totals.tuitionReceived, totals.payingStudents) : null;
  const profit = totals ? totals.incomePaid - totals.expensePaid : 0;
  const prevProfit = prevTotals ? prevTotals.incomePaid - prevTotals.expensePaid : 0;

  const yearComparison = yearly
    ? Array.from({ length: 12 }, (_, i) => {
        const mm = String(i + 1).padStart(2, "0");
        const y = to.slice(0, 4);
        const py = String(Number(y) - 1);
        return {
          label: formatMonth(`${y}-${mm}-01`).split("/")[0]!,
          current: yearly.find((r) => r.month === `${y}-${mm}-01`)?.income ?? 0,
          previous: yearly.find((r) => r.month === `${py}-${mm}-01`)?.income ?? 0,
        };
      })
    : null;

  // Alertas
  const alerts: Alert[] = [];
  if (showBilling) {
    const dueSoon = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendente")
      .gte("due_date", today)
      .lte("due_date", addDays(today, gym.data?.due_alert_days ?? 3));
    if (totals && totals.overdueInvoices > 0)
      alerts.push({
        tone: "danger",
        text: `${totals.overdueInvoices} mensalidade(s) em atraso somando ${formatCurrency(totals.overdueTotal)}`,
        href: "/mensalidades?situacao=atrasado",
      });
    if ((dueSoon.count ?? 0) > 0)
      alerts.push({ tone: "warning", text: `${dueSoon.count} mensalidade(s) vencem nos próximos dias`, href: "/mensalidades?situacao=pendente" });
  }
  const attendance = await supabase.rpc("student_attendance", { p_days: 30 });
  const absent = (attendance.data ?? []).filter((a) => Number(a.days_since_last) >= (gym.data?.absence_alert_days ?? 10));
  if (absent.length)
    alerts.push({ tone: "warning", text: `${absent.length} aluno(s) ativo(s) sem frequência recente — risco de abandono`, href: "/frequencia" });
  if (showFinance && totals && totals.expensePending > 0) {
    alerts.push({ tone: "info", text: `${formatCurrency(totals.expensePending)} em contas a pagar no período`, href: "/financeiro?status=pendente&tipo=despesa" });
  }
  if (projection && projection.rows.some((r) => r.balance < 0)) {
    const first = projection.rows.find((r) => r.balance < 0)!;
    alerts.push({ tone: "danger", text: `Projeção indica saldo negativo em ${formatMonth(first.month, "long")}`, href: "/financeiro/fluxo-de-caixa" });
  }
  if (showFinance && totals && profit < 0) alerts.push({ tone: "danger", text: "Despesas superam as receitas no período", href: "/financeiro/dre" });

  return (
    <>
      <PageHeader
        title={`Olá, ${user.fullName.split(" ")[0]}`}
        description="Indicadores calculados a partir dos dados registrados no sistema."
        actions={<PeriodFilter from={from} to={to} presets={periodPresets()} />}
      />

      {alerts.length > 0 && (
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="size-4 text-primary" /> Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 px-4 md:grid-cols-2">
            {alerts.map((a) => (
              <Link
                key={a.text}
                href={a.href}
                className={cn(
                  "group flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted",
                  a.tone === "danger" && "border-red-200 dark:border-red-500/30",
                  a.tone === "warning" && "border-amber-200 dark:border-amber-500/30",
                )}
              >
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    a.tone === "danger" ? "bg-destructive" : a.tone === "warning" ? "bg-amber-500" : "bg-slate-400",
                  )}
                  aria-hidden
                />
                <span className="flex-1">{a.text}</span>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <section aria-label="Alunos" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Alunos ativos" value={formatNumber(ativos)} icon={Users} tone="brand" hint={`${formatNumber(Number(c?.suspensos ?? 0))} suspensos`} />
        <StatCard label="Inativos" value={formatNumber(Number(c?.inativos ?? 0))} icon={UserMinus} hint={`${formatNumber(Number(c?.arquivados ?? 0))} arquivados`} />
        <StatCard label="Inadimplentes" value={formatNumber(Number(c?.inadimplentes ?? 0))} icon={UserX} tone="danger" hint="com mensalidade vencida" />
        <StatCard
          label="Novas matrículas"
          value={formatNumber(newStudents.count ?? 0)}
          icon={UserPlus}
          change={percentChange(newStudents.count ?? 0, prevNew.count ?? 0)}
          hint={`${formatNumber(cancels.count ?? 0)} cancelamentos (ant.: ${formatNumber(prevCancels.count ?? 0)})`}
        />
        <StatCard label="Retenção no período" value={formatPercent(retention)} icon={UserCheck} hint="1 − cancelamentos ÷ ativos no início" />
        <StatCard label="Frequência média" value={freq == null ? "—" : `${freq.toLocaleString("pt-BR")}×/sem`} icon={Gauge} hint={`${formatNumber(checkins.count ?? 0)} check-ins`} />
        {totals && (
          <>
            <StatCard label="Mensalidades recebidas" value={formatCurrency(totals.tuitionReceived)} icon={Receipt} change={prevTotals ? percentChange(totals.tuitionReceived, prevTotals.tuitionReceived) : null} />
            <StatCard label="Mensalidades pendentes" value={formatCurrency(totals.incomePending)} icon={CalendarClock} hint={`Em atraso (total): ${formatCurrency(totals.overdueTotal)}`} />
          </>
        )}
      </section>

      {showFinance && totals && prevTotals && monthly && yearComparison && projection && (
        <>
          <section aria-label="Financeiro" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Receita (caixa)" value={formatCurrency(totals.incomePaid)} icon={TrendingUp} tone="success" change={percentChange(totals.incomePaid, prevTotals.incomePaid)} />
            <StatCard label="Despesas (caixa)" value={formatCurrency(totals.expensePaid)} icon={TrendingDown} invertChange change={percentChange(totals.expensePaid, prevTotals.expensePaid)} />
            <StatCard
              label={profit >= 0 ? "Lucro do período" : "Prejuízo do período"}
              value={formatCurrency(profit)}
              icon={CircleDollarSign}
              tone={profit >= 0 ? "success" : "danger"}
              change={percentChange(profit, prevProfit)}
            />
            <StatCard label="Ticket médio" value={ticket == null ? "—" : formatCurrency(ticket)} icon={Banknote} hint={`${formatNumber(totals.payingStudents)} alunos pagantes`} />
            <StatCard label="Saldo de caixa atual" value={formatCurrency(balance)} icon={Wallet} tone={(balance ?? 0) >= 0 ? "brand" : "danger"} hint="saldo inicial + liquidações" />
            <StatCard label="A receber no período" value={formatCurrency(totals.incomePending)} icon={CalendarClock} />
            <StatCard label="A pagar no período" value={formatCurrency(totals.expensePending)} icon={CalendarClock} />
            <StatCard
              label="Saldo projetado (6 meses)"
              value={formatCurrency(projection.rows.at(-1)?.balance ?? 0)}
              icon={TrendingUp}
              hint="estimativa — ver premissas"
            />
          </section>

          <div className="grid gap-4 xl:grid-cols-5">
            <Card className="xl:col-span-3">
              <CardHeader>
                <CardTitle>Receitas x despesas</CardTitle>
                <CardDescription>Últimos 12 meses, regime de caixa</CardDescription>
              </CardHeader>
              <CardContent>
                <IncomeExpenseChart data={monthly} />
              </CardContent>
            </Card>
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Fluxo de caixa projetado</CardTitle>
                <CardDescription>
                  Estimativa com receita recorrente de {formatCurrency(projection.assumptions.mrr)}/mês e inadimplência de{" "}
                  {formatPercent(projection.assumptions.delinquencyRate)}. Não é garantia de resultado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectionChart data={projection.rows} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Receita: {to.slice(0, 4)} x {Number(to.slice(0, 4)) - 1}</CardTitle>
              <CardDescription>Comparação mês a mês com o ano anterior</CardDescription>
            </CardHeader>
            <CardContent>
              <YearComparisonChart data={yearComparison} />
            </CardContent>
          </Card>
        </>
      )}

      {!showFinance && (
        <Card>
          <CardHeader>
            <CardTitle>Atalhos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/frequencia">Registrar check-in</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/alunos">Alunos</Link>
            </Button>
            {showBilling && (
              <Button variant="outline" asChild>
                <Link href="/mensalidades">Mensalidades</Link>
              </Button>
            )}
            {canAccess(user.role, "treinos") && (
              <Button variant="outline" asChild>
                <Link href="/treinos">Fichas de treino</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
