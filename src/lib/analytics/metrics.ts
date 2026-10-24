import { round2 } from "@/lib/utils";

/** Ticket médio = receita de mensalidades ÷ alunos pagantes distintos. */
export function averageTicket(revenue: number, payingStudents: number): number | null {
  return payingStudents > 0 ? round2(revenue / payingStudents) : null;
}

/** Retenção do período = 1 − cancelamentos ÷ ativos no início. */
export function retentionRate(activeAtStart: number, cancellations: number): number | null {
  if (activeAtStart <= 0) return null;
  return Math.max(0, Math.min(1, 1 - cancellations / activeAtStart));
}

/** Variação percentual entre dois valores (null quando a base é zero). */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / Math.abs(previous);
}

/** Frequência média semanal por aluno ativo. */
export function weeklyFrequency(checkins: number, activeStudents: number, days: number): number | null {
  if (activeStudents <= 0 || days <= 0) return null;
  return round2(checkins / activeStudents / (days / 7));
}

/** Inclinação da regressão linear simples (tendência por período). */
export function linearTrend(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((y, x) => {
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) ** 2;
  });
  return den === 0 ? 0 : num / den;
}

export type AbandonRisk = "baixo" | "medio" | "alto";

/** Risco de abandono pela ausência e frequência recente. */
export function abandonRisk(daysSinceLast: number, checkinsLast30: number): AbandonRisk {
  if (daysSinceLast >= 21 || (daysSinceLast >= 14 && checkinsLast30 <= 2)) return "alto";
  if (daysSinceLast >= 10 || checkinsLast30 <= 4) return "medio";
  return "baixo";
}
