import { round2 } from "@/lib/utils";

export type InvestmentInput = {
  amount: number;
  monthlyReturn: number;
  monthlyCost: number;
  months: number;
  /** Taxa de desconto mensal (ex.: 0.01 = 1% a.m.) para VPL. */
  discountRate?: number;
};

export type InvestmentResult = {
  netMonthly: number;
  totalReturn: number;
  profit: number;
  roi: number | null;
  paybackMonths: number | null;
  npv: number;
  series: { month: number; cumulative: number }[];
};

/** Simulação de investimento — resultados são ESTIMATIVAS, não garantias. */
export function simulateInvestment(input: InvestmentInput): InvestmentResult {
  const netMonthly = round2(input.monthlyReturn - input.monthlyCost);
  const rate = input.discountRate ?? 0;
  let cumulative = -input.amount;
  let npv = -input.amount;
  let payback: number | null = null;
  const series = [{ month: 0, cumulative: round2(cumulative) }];
  for (let m = 1; m <= input.months; m++) {
    const before = cumulative;
    cumulative += netMonthly;
    npv += netMonthly / Math.pow(1 + rate, m);
    if (payback === null && before < 0 && cumulative >= 0 && netMonthly > 0) {
      payback = round2(m - 1 + -before / netMonthly);
    }
    series.push({ month: m, cumulative: round2(cumulative) });
  }
  if (input.amount === 0) payback = 0;
  const totalReturn = round2(netMonthly * input.months);
  const profit = round2(totalReturn - input.amount);
  return {
    netMonthly,
    totalReturn,
    profit,
    roi: input.amount > 0 ? profit / input.amount : null,
    paybackMonths: payback,
    npv: round2(npv),
    series,
  };
}

export const SCENARIOS = [
  { key: "pessimista", label: "Pessimista", returnFactor: 0.7, costFactor: 1.15 },
  { key: "base", label: "Base", returnFactor: 1, costFactor: 1 },
  { key: "otimista", label: "Otimista", returnFactor: 1.25, costFactor: 0.95 },
] as const;

export function simulateScenarios(input: InvestmentInput) {
  return SCENARIOS.map((s) => ({
    ...s,
    result: simulateInvestment({
      ...input,
      monthlyReturn: input.monthlyReturn * s.returnFactor,
      monthlyCost: input.monthlyCost * s.costFactor,
    }),
  }));
}
