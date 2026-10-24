import { describe, expect, it } from "vitest";
import { generateInsights } from "@/lib/analytics/insights";
import { abandonRisk, averageTicket, linearTrend, percentChange, retentionRate, weeklyFrequency } from "@/lib/analytics/metrics";

describe("métricas", () => {
  it("ticket médio, retenção e variação", () => {
    expect(averageTicket(15000, 100)).toBe(150);
    expect(averageTicket(100, 0)).toBeNull();
    expect(retentionRate(100, 5)).toBe(0.95);
    expect(percentChange(120, 100)).toBeCloseTo(0.2);
    expect(percentChange(5, 0)).toBeNull();
  });
  it("frequência semanal e tendência", () => {
    expect(weeklyFrequency(300, 50, 30)).toBe(1.4);
    expect(linearTrend([1, 2, 3, 4])).toBe(1);
    expect(linearTrend([5])).toBe(0);
  });
  it("classifica risco de abandono", () => {
    expect(abandonRisk(25, 0)).toBe("alto");
    expect(abandonRisk(11, 6)).toBe("medio");
    expect(abandonRisk(2, 12)).toBe("baixo");
  });
});

describe("insights explicáveis", () => {
  it("detecta gasto elevado, queda de receita e prejuízo", () => {
    const insights = generateInsights({
      monthly: [
        { month: "2026-05-01", income: 20000, expense: 15000 },
        { month: "2026-06-01", income: 18000, expense: 15000 },
        { month: "2026-07-01", income: 16000, expense: 15000 },
        { month: "2026-08-01", income: 14000, expense: 15000 },
      ],
      categoryByMonth: [{ category: "Energia elétrica", current: 3000, averagePrevious: 1500 }],
      delinquency: { current: 0.12, previous: 0.05 },
      activeStudents: 100,
      plans: [],
    });
    const ids = insights.map((i) => i.id);
    expect(ids).toContain("gasto-Energia elétrica");
    expect(ids).toContain("tendencia-receita");
    expect(ids).toContain("inadimplencia");
    expect(ids).toContain("prejuizo");
    expect(insights[0]!.severity).toBe("critico");
    insights.forEach((i) => expect(i.explanation.length).toBeGreaterThan(10));
  });
  it("sem dados não gera recomendações", () => {
    expect(generateInsights({ monthly: [], categoryByMonth: [], delinquency: { current: 0, previous: 0 }, activeStudents: 0, plans: [] })).toEqual([]);
  });
});
