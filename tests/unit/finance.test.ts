import { describe, expect, it } from "vitest";
import { buildCashbook } from "@/lib/finance/cashbook";
import { buildDre } from "@/lib/finance/dre";
import { simulateInvestment, simulateScenarios } from "@/lib/finance/investment";
import { projectCashFlow } from "@/lib/finance/projection";

describe("projeção de caixa", () => {
  it("projeta receitas, despesas e saldo acumulado", () => {
    const rows = projectCashFlow({
      history: [
        { month: "2026-07-01", income: 10000, expense: 7000 },
        { month: "2026-08-01", income: 10000, expense: 8000 },
        { month: "2026-09-01", income: 10000, expense: 9000 },
      ],
      recurringRevenue: 9000,
      currentBalance: 5000,
      scheduled: [{ month: "2026-11-01", income: 0, expense: 12000 }],
      delinquencyRate: 0.1,
      months: 3,
      fromMonth: "2026-10-15",
    });
    // receita = 9000 * 0.9 + (10000 - 9000) = 9100; despesa média = 8000
    expect(rows[0]).toEqual({ month: "2026-10-01", income: 9100, expense: 8000, net: 1100, balance: 6100 });
    expect(rows[1]!.expense).toBe(12000); // usa o agendado quando maior
    expect(rows[2]!.balance).toBe(6100 - 2900 + 1100);
  });
});

describe("simulador de investimentos", () => {
  it("calcula ROI, payback e VPL", () => {
    const r = simulateInvestment({ amount: 12000, monthlyReturn: 1500, monthlyCost: 500, months: 24 });
    expect(r.netMonthly).toBe(1000);
    expect(r.paybackMonths).toBe(12);
    expect(r.profit).toBe(12000);
    expect(r.roi).toBe(1);
    expect(r.npv).toBe(12000);
  });
  it("sem retorno líquido não há payback", () => {
    const r = simulateInvestment({ amount: 5000, monthlyReturn: 100, monthlyCost: 200, months: 12 });
    expect(r.paybackMonths).toBeNull();
    expect(r.roi).toBeLessThan(0);
  });
  it("payback fracionado e VPL descontado", () => {
    const r = simulateInvestment({ amount: 1000, monthlyReturn: 300, monthlyCost: 0, months: 12, discountRate: 0.01 });
    expect(r.paybackMonths).toBeCloseTo(3.33, 2);
    expect(r.npv).toBeLessThan(2600);
  });
  it("gera três cenários ordenados", () => {
    const s = simulateScenarios({ amount: 10000, monthlyReturn: 1000, monthlyCost: 200, months: 24 });
    expect(s.map((x) => x.key)).toEqual(["pessimista", "base", "otimista"]);
    expect(s[0]!.result.profit).toBeLessThan(s[1]!.result.profit);
    expect(s[2]!.result.profit).toBeGreaterThan(s[1]!.result.profit);
  });
});

describe("DRE gerencial", () => {
  it("monta as linhas do resultado", () => {
    const dre = buildDre([
      { category_name: "Mensalidades", type: "receita", dre_group: "receita_operacional", total: 20000 },
      { category_name: "Produtos", type: "receita", dre_group: "outras_receitas", total: 1000 },
      { category_name: "Impostos", type: "despesa", dre_group: "impostos", total: 1200 },
      { category_name: "Energia", type: "despesa", dre_group: "custo_variavel", total: 1800 },
      { category_name: "Aluguel", type: "despesa", dre_group: "despesa_fixa", total: 8000 },
      { category_name: "Investimentos", type: "despesa", dre_group: "investimento", total: 3000 },
    ]);
    expect(dre.receitaBruta).toBe(21000);
    expect(dre.receitaLiquida).toBe(19800);
    expect(dre.margem).toBe(18000);
    expect(dre.operacional).toBe(10000);
    expect(dre.final).toBe(7000);
    expect(dre.lines.at(-1)!.kind).toBe("total");
  });
});

describe("livro-caixa", () => {
  it("calcula saldo acumulado em ordem cronológica", () => {
    const rows = buildCashbook(1000, [
      { id: "b", date: "2026-10-02", type: "despesa", amount: 300, description: "Luz" },
      { id: "a", date: "2026-10-01", type: "receita", amount: 500, description: "Mensalidade" },
    ]);
    expect(rows.map((r) => r.balance)).toEqual([1500, 1200]);
  });
});
