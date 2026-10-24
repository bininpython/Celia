import "server-only";
import { addDays, addMonths, diffDays, endOfMonth, startOfMonth, todayISO } from "@/lib/dates";
import { projectCashFlow, type MonthlyFlow } from "@/lib/finance/projection";
import type { ServerSupabase } from "@/lib/supabase/server";

const n = (v: unknown) => Number(v ?? 0);

export async function getFinTotals(supabase: ServerSupabase, from: string, to: string) {
  const { data, error } = await supabase.rpc("fin_totals", { p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  const r = data?.[0];
  return {
    incomePaid: n(r?.income_paid),
    expensePaid: n(r?.expense_paid),
    incomePending: n(r?.income_pending),
    expensePending: n(r?.expense_pending),
    tuitionReceived: n(r?.tuition_received),
    payingStudents: n(r?.paying_students),
    billed: n(r?.billed_amount),
    overdueInPeriod: n(r?.overdue_in_period),
    overdueTotal: n(r?.overdue_total),
    overdueInvoices: n(r?.overdue_invoices),
  };
}

export async function getMonthly(supabase: ServerSupabase, from: string, to: string) {
  const { data, error } = await supabase.rpc("fin_monthly", { p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    month: r.month,
    income: n(r.income_paid),
    expense: n(r.expense_paid),
    incomePending: n(r.income_pending),
    expensePending: n(r.expense_pending),
    incomeCompetence: n(r.income_competence),
    expenseCompetence: n(r.expense_competence),
  }));
}

export async function getCashBalance(supabase: ServerSupabase, at = todayISO()) {
  const { data, error } = await supabase.rpc("cash_balance", { p_at: at });
  if (error) throw new Error(error.message);
  return n(data);
}

export async function getRecurringRevenue(supabase: ServerSupabase, from: string, to: string) {
  const { data, error } = await supabase.rpc("plan_stats", { p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  const plans = (data ?? []).map((p) => ({
    id: p.plan_id,
    name: p.plan_name,
    periodicity: p.periodicity,
    price: n(p.price),
    duration: n(p.duration_months),
    active: n(p.active_memberships),
    monthlyRecurring: n(p.monthly_recurring),
    received: n(p.received),
  }));
  return { plans, mrr: plans.reduce((a, p) => a + p.monthlyRecurring, 0) };
}

/** Projeção de 3/6/12 meses a partir do histórico real (estimativa). */
export async function getProjection(supabase: ServerSupabase, months: number) {
  const today = todayISO();
  const som = startOfMonth(today);
  const [history, future, balance, rec, delinq] = await Promise.all([
    getMonthly(supabase, addMonths(som, -3), endOfMonth(addMonths(som, -1))),
    getMonthly(supabase, som, endOfMonth(addMonths(som, months - 1))),
    getCashBalance(supabase, today),
    getRecurringRevenue(supabase, addMonths(som, -3), today),
    getFinTotals(supabase, addDays(today, -90), addDays(today, -1)),
  ]);
  const delinquencyRate = delinq.billed > 0 ? Math.min(1, delinq.overdueInPeriod / delinq.billed) : 0;
  const scheduled: MonthlyFlow[] = future.map((f) => ({ month: f.month, income: f.incomePending, expense: f.expensePending }));
  const base = { history, recurringRevenue: rec.mrr, currentBalance: balance, scheduled, delinquencyRate, months, fromMonth: som };
  const rows = projectCashFlow(base);
  const pess = projectCashFlow({ ...base, scenario: 0.85 });
  const otim = projectCashFlow({ ...base, scenario: 1.1 });
  return {
    rows: rows.map((r, i) => ({ ...r, pessimista: pess[i]!.balance, otimista: otim[i]!.balance })),
    assumptions: { mrr: rec.mrr, delinquencyRate, balance, historyMonths: history.length },
  };
}

export function previousPeriod(from: string, to: string) {
  const len = diffDays(from, to) + 1;
  return { from: addDays(from, -len), to: addDays(from, -1) };
}
