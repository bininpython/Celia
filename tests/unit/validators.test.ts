import { describe, expect, it } from "vitest";
import { isValidCpf } from "@/lib/validators/common";
import { planSchema, paymentSchema } from "@/lib/validators/billing";
import { studentSchema } from "@/lib/validators/students";
import { transactionSchema } from "@/lib/validators/finance";

describe("validação", () => {
  it("valida CPF", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
  });
  it("aluno exige consentimento LGPD e normaliza campos", () => {
    const base = { full_name: "Maria", start_date: "2026-10-01", due_day: "10", cpf: "", email: "", phone: "(11) 98765-4321" };
    expect(studentSchema.safeParse(base).success).toBe(false);
    const r = studentSchema.parse({ ...base, lgpd_consent: true });
    expect(r.cpf).toBeNull();
    expect(r.email).toBeNull();
    expect(r.phone).toBe("11987654321");
    expect(r.due_day).toBe(10);
  });
  it("plano exige duração compatível com a periodicidade", () => {
    expect(planSchema.safeParse({ name: "T", periodicity: "trimestral", duration_months: 3, price: "300" }).success).toBe(true);
    expect(planSchema.safeParse({ name: "T", periodicity: "trimestral", duration_months: 2, price: "300" }).success).toBe(false);
    expect(planSchema.safeParse({ name: "P", periodicity: "personalizado", duration_months: 2, price: "300" }).success).toBe(true);
  });
  it("aceita valores no formato brasileiro e decimal", () => {
    const p = paymentSchema.parse({
      invoice_id: "20000000-0000-4000-8000-00000000000a", method: "pix", paid_on: "2026-10-24",
      amount: "1.234,56", fine: "0", interest: "", discount: "2.5",
    });
    expect(p.amount).toBe(1234.56);
    expect(p.discount).toBe(2.5);
  });
  it("lançamento exige categoria e valor positivo", () => {
    const r = transactionSchema.safeParse({ type: "despesa", category_id: "", description: "x", amount: "0", competence_date: "2026-10-01", due_date: "2026-10-01", repeat_months: 1 });
    expect(r.success).toBe(false);
  });
});
