import { addMonths, startOfMonth } from "@/lib/dates";
import { round2 } from "@/lib/utils";

export type MonthlyFlow = { month: string; income: number; expense: number };

export type ProjectionInput = {
  /** Histórico realizado (regime de caixa), em ordem cronológica. */
  history: MonthlyFlow[];
  /** Receita recorrente mensal das matrículas ativas. */
  recurringRevenue: number;
  /** Saldo de caixa atual. */
  currentBalance: number;
  /** Lançamentos já agendados (contas a pagar/receber) por mês. */
  scheduled: MonthlyFlow[];
  /** Taxa de inadimplência histórica (0..1) aplicada sobre a receita recorrente. */
  delinquencyRate: number;
  months: number;
  fromMonth: string;
  /** Multiplicador de cenário (1 = base). */
  scenario?: number;
};

export type ProjectionRow = MonthlyFlow & { balance: number; net: number };

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/**
 * Projeção de fluxo de caixa — ESTIMATIVA.
 * Receita = recorrente das matrículas ativas × (1 − inadimplência) + média de
 * outras receitas dos últimos 3 meses (ou o agendado, se maior).
 * Despesa = média das despesas dos últimos 3 meses ou o já agendado, o que for maior.
 */
export function projectCashFlow(input: ProjectionInput): ProjectionRow[] {
  const recent = input.history.slice(-3);
  const avgIncome = avg(recent.map((h) => h.income));
  const avgExpense = avg(recent.map((h) => h.expense));
  const otherIncome = Math.max(0, avgIncome - input.recurringRevenue);
  const scenario = input.scenario ?? 1;
  const scheduledBy = new Map(input.scheduled.map((s) => [startOfMonth(s.month), s]));

  let balance = input.currentBalance;
  const rows: ProjectionRow[] = [];
  for (let i = 0; i < input.months; i++) {
    const month = addMonths(startOfMonth(input.fromMonth), i);
    const sched = scheduledBy.get(month);
    const baseIncome = input.recurringRevenue * (1 - input.delinquencyRate) + otherIncome;
    const income = round2(Math.max(baseIncome * scenario, sched?.income ?? 0));
    const expense = round2(Math.max(avgExpense, sched?.expense ?? 0));
    const net = round2(income - expense);
    balance = round2(balance + net);
    rows.push({ month, income, expense, net, balance });
  }
  return rows;
}
