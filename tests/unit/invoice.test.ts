import { describe, expect, it } from "vitest";
import { displayStatus, invoiceTotal, lateCharges, monthlyEquivalent } from "@/lib/finance/invoice";

describe("mensalidades", () => {
  it("calcula total com desconto, multa e juros", () => {
    expect(invoiceTotal({ amount: 150, discount: 10, fine: 2.8, interest: 0.47 })).toBe(143.27);
  });
  it("marca pendente vencida como em atraso", () => {
    expect(displayStatus({ status: "pendente", due_date: "2026-10-10" }, "2026-10-11")).toBe("atrasado");
    expect(displayStatus({ status: "pendente", due_date: "2026-10-10" }, "2026-10-10")).toBe("pendente");
    expect(displayStatus({ status: "pago", due_date: "2026-01-01" }, "2026-10-10")).toBe("pago");
  });
  it("aplica multa de 2% e juros de 1% a.m. pro rata", () => {
    const r = lateCharges({ amount: 150, discount: 0, dueDate: "2026-10-05", payDate: "2026-10-15", finePercent: 2, monthlyInterestPercent: 1 });
    expect(r).toEqual({ days: 10, fine: 3, interest: 0.5 });
  });
  it("não cobra encargos antes do vencimento", () => {
    expect(lateCharges({ amount: 150, dueDate: "2026-10-05", payDate: "2026-10-05", finePercent: 2, monthlyInterestPercent: 1 })).toEqual({
      days: 0, fine: 0, interest: 0,
    });
  });
  it("calcula valor mensal equivalente", () => {
    expect(monthlyEquivalent(1200, 120, 12)).toBe(90);
    expect(monthlyEquivalent(100, 0, 0)).toBe(0);
  });
});
