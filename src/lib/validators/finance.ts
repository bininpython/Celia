import { z } from "zod";
import { checkbox, intRange, isoDate, optionalDate, optionalText, optionalUuid, positiveMoney, requiredText } from "./common";

export const transactionSchema = z
  .object({
    type: z.enum(["receita", "despesa"]),
    category_id: z.uuid({ error: "Selecione a categoria" }),
    supplier_id: optionalUuid(),
    description: requiredText("Descrição", 200),
    amount: positiveMoney("Valor"),
    competence_date: isoDate("Competência"),
    due_date: isoDate("Vencimento"),
    paid_date: optionalDate(),
    nature: z.preprocess((v) => (v === "" || v === undefined ? null : v), z.enum(["fixa", "variavel"]).nullable()),
    payment_method: z.preprocess(
      (v) => (v === "" || v === undefined ? null : v),
      z.enum(["pix", "cartao_credito", "cartao_debito", "dinheiro", "transferencia"]).nullable(),
    ),
    document_number: optionalText(60),
    notes: optionalText(500),
    repeat_months: intRange("Repetições", 1, 24),
  });
export type TransactionInput = z.input<typeof transactionSchema>;

export const settleSchema = z.object({ id: z.uuid(), paid_date: isoDate("Data") });

export const categorySchema = z.object({
  name: requiredText("Nome", 80),
  type: z.enum(["receita", "despesa"]),
  nature: z.enum(["fixa", "variavel"]),
  dre_group: z.enum(["receita_operacional", "outras_receitas", "impostos", "custo_variavel", "despesa_fixa", "investimento"]),
  color: optionalText(9),
});
export type CategoryInput = z.input<typeof categorySchema>;

export const supplierSchema = z.object({
  name: requiredText("Nome", 120),
  document: optionalText(20),
  email: optionalText(120),
  phone: optionalText(20),
  category: optionalText(80),
  notes: optionalText(500),
  active: checkbox(),
});
export type SupplierInput = z.input<typeof supplierSchema>;

export const budgetSchema = z.object({
  category_id: z.uuid(),
  month: isoDate("Mês"),
  amount: z.preprocess((v) => (v === "" ? 0 : Number(v)), z.number().min(0)),
});

export const investmentSchema = z.object({
  name: requiredText("Nome", 120),
  kind: z.enum(["equipamento", "reforma", "publicidade", "expansao", "tecnologia", "outro"]),
  amount: positiveMoney("Valor"),
  invested_at: optionalDate(),
  expected_monthly_return: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().min(0)),
  expected_monthly_cost: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().min(0)),
  useful_life_months: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().positive().max(240).nullable()),
  status: z.enum(["planejado", "executado", "cancelado"]),
  notes: optionalText(1000),
});
export type InvestmentInput = z.input<typeof investmentSchema>;
