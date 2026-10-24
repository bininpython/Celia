import { z } from "zod";
import { intRange, isoDate, money, optionalDate, optionalText, positiveMoney, requiredText } from "./common";

export const planSchema = z
  .object({
    name: requiredText("Nome", 80),
    periodicity: z.enum(["mensal", "trimestral", "semestral", "anual", "personalizado"]),
    duration_months: intRange("Duração", 1, 36),
    price: money("Preço"),
    weekly_frequency: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(1).max(7).nullable()),
    description: optionalText(500),
    active: z.boolean().default(true),
  })
  .refine(
    (p) =>
      p.periodicity === "personalizado" ||
      ({ mensal: 1, trimestral: 3, semestral: 6, anual: 12 } as const)[p.periodicity] === p.duration_months,
    { message: "Duração incompatível com a periodicidade", path: ["duration_months"] },
  );
export type PlanInput = z.input<typeof planSchema>;

export const membershipSchema = z
  .object({
    student_id: z.uuid(),
    plan_id: z.uuid({ error: "Selecione um plano" }),
    start_date: isoDate("Início"),
    end_date: optionalDate(),
    price: money("Valor"),
    discount: money("Desconto"),
    auto_renew: z.boolean().default(true),
    generate_first_invoice: z.boolean().default(true),
  })
  .refine((m) => m.discount <= m.price, { message: "Desconto maior que o valor", path: ["discount"] })
  .refine((m) => !m.end_date || m.end_date >= m.start_date, { message: "Término antes do início", path: ["end_date"] });
export type MembershipInput = z.input<typeof membershipSchema>;

export const cancelMembershipSchema = z.object({
  id: z.uuid(),
  reason: requiredText("Motivo", 300),
  cancel_open_invoices: z.boolean().default(true),
});

export const invoiceSchema = z
  .object({
    student_id: z.uuid({ error: "Selecione o aluno" }),
    description: requiredText("Descrição", 160),
    due_date: isoDate("Vencimento"),
    amount: positiveMoney("Valor"),
    discount: money("Desconto"),
    notes: optionalText(500),
  })
  .refine((i) => i.discount <= i.amount, { message: "Desconto maior que o valor", path: ["discount"] });
export type InvoiceInput = z.input<typeof invoiceSchema>;

export const paymentSchema = z.object({
  invoice_id: z.uuid(),
  method: z.enum(["pix", "cartao_credito", "cartao_debito", "dinheiro", "transferencia"], {
    error: "Selecione a forma de pagamento",
  }),
  paid_on: isoDate("Data do pagamento"),
  amount: positiveMoney("Valor"),
  fine: money("Multa"),
  interest: money("Juros"),
  discount: money("Desconto"),
  notes: optionalText(300),
});
export type PaymentInput = z.input<typeof paymentSchema>;

export const renegotiationSchema = z.object({
  invoice_ids: z.array(z.uuid()).min(1, "Selecione ao menos uma mensalidade"),
  installments: intRange("Parcelas", 1, 24),
  first_due: isoDate("Primeiro vencimento"),
  total: positiveMoney("Valor total"),
  notes: optionalText(300),
});
export type RenegotiationInput = z.input<typeof renegotiationSchema>;

export const reversalSchema = z.object({ payment_id: z.uuid(), reason: requiredText("Motivo", 300) });
export const generateInvoicesSchema = z.object({ month: isoDate("Competência") });
