import { formatCurrency, formatPercent } from "@/lib/format";
import { linearTrend, percentChange } from "@/lib/analytics/metrics";

export type Insight = {
  id: string;
  severity: "info" | "atencao" | "critico" | "positivo";
  title: string;
  /** Explicação com os dados que originaram a recomendação. */
  explanation: string;
  recommendation: string;
};

export type InsightInput = {
  monthly: { month: string; income: number; expense: number }[];
  categoryByMonth: { category: string; current: number; averagePrevious: number }[];
  delinquency: { current: number; previous: number };
  activeStudents: number;
  plans: { name: string; activeMemberships: number; monthlyRecurring: number }[];
};

/**
 * Regras analíticas explicáveis. Cada insight cita os números usados.
 * São indicadores para apoio à decisão — estimativas, não garantias.
 */
export function generateInsights(input: InsightInput): Insight[] {
  const out: Insight[] = [];
  const m = input.monthly;

  // 1. Categorias de despesa acima da média
  for (const c of input.categoryByMonth) {
    if (c.averagePrevious <= 0 || c.current < 100) continue;
    const change = percentChange(c.current, c.averagePrevious);
    if (change !== null && change >= 0.25) {
      out.push({
        id: `gasto-${c.category}`,
        severity: change >= 0.5 ? "critico" : "atencao",
        title: `Gasto elevado em ${c.category}`,
        explanation: `${formatCurrency(c.current)} no último mês contra média de ${formatCurrency(
          c.averagePrevious,
        )} nos meses anteriores (+${formatPercent(change)}).`,
        recommendation: "Revise contratos, consumo e fornecedores desta categoria.",
      });
    }
  }

  // 2. Tendência de receita (últimos 6 meses)
  const incomes = m.slice(-6).map((x) => x.income);
  if (incomes.length >= 3) {
    const slope = linearTrend(incomes);
    const avgIncome = incomes.reduce((a, b) => a + b, 0) / incomes.length;
    if (avgIncome > 0 && Math.abs(slope) / avgIncome >= 0.03) {
      out.push({
        id: "tendencia-receita",
        severity: slope > 0 ? "positivo" : "atencao",
        title: slope > 0 ? "Receita em tendência de alta" : "Receita em tendência de queda",
        explanation: `Variação média de ${formatCurrency(slope)} por mês nos últimos ${incomes.length} meses (média ${formatCurrency(
          avgIncome,
        )}).`,
        recommendation:
          slope > 0
            ? "Mantenha as ações de captação e acompanhe a capacidade de atendimento."
            : "Avalie campanhas de retenção e reativação de alunos inativos.",
      });
    }
  }

  // 3. Inadimplência
  const { current, previous } = input.delinquency;
  if (current >= 0.05 && current > previous + 0.02) {
    out.push({
      id: "inadimplencia",
      severity: current >= 0.15 ? "critico" : "atencao",
      title: "Aumento da inadimplência",
      explanation: `Taxa atual de ${formatPercent(current)} contra ${formatPercent(previous)} no período anterior.`,
      recommendation: "Intensifique a cobrança preventiva e ofereça renegociação para casos recorrentes.",
    });
  }

  // 4. Custo por aluno
  const last = m.at(-1);
  if (last && input.activeStudents > 0 && last.expense > 0) {
    const costPerStudent = last.expense / input.activeStudents;
    const revenuePerStudent = last.income / input.activeStudents;
    out.push({
      id: "custo-aluno",
      severity: costPerStudent > revenuePerStudent ? "critico" : "info",
      title: "Custo por aluno ativo",
      explanation: `Despesa de ${formatCurrency(costPerStudent)} e receita de ${formatCurrency(
        revenuePerStudent,
      )} por aluno no último mês (${input.activeStudents} ativos).`,
      recommendation:
        costPerStudent > revenuePerStudent
          ? "O custo por aluno supera a receita: revise preços ou estrutura de custos."
          : "Margem por aluno positiva. Acompanhe mensalmente.",
    });
  }

  // 5. Resultado negativo
  if (last && last.income - last.expense < 0) {
    out.push({
      id: "prejuizo",
      severity: "critico",
      title: "Resultado negativo no último mês",
      explanation: `Receitas de ${formatCurrency(last.income)} e despesas de ${formatCurrency(last.expense)}.`,
      recommendation: "Priorize despesas essenciais e verifique recebimentos pendentes.",
    });
  }

  // 6. Rentabilidade por plano
  const withMembers = input.plans.filter((p) => p.activeMemberships > 0);
  if (withMembers.length >= 2) {
    const best = [...withMembers].sort((a, b) => b.monthlyRecurring - a.monthlyRecurring)[0]!;
    const totalRecurring = withMembers.reduce((a, p) => a + p.monthlyRecurring, 0);
    out.push({
      id: "plano-destaque",
      severity: "info",
      title: `Plano ${best.name} lidera a receita recorrente`,
      explanation: `${formatCurrency(best.monthlyRecurring)}/mês (${formatPercent(
        totalRecurring > 0 ? best.monthlyRecurring / totalRecurring : 0,
      )} do total) com ${best.activeMemberships} matrículas ativas.`,
      recommendation: "Considere este plano como referência em campanhas e renovações.",
    });
  }

  const order = { critico: 0, atencao: 1, positivo: 2, info: 3 } as const;
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}
