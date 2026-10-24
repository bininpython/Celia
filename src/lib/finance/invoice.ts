import { diffDays } from "@/lib/dates";
import type { InvoiceDisplayStatus } from "@/lib/labels";
import { round2 } from "@/lib/utils";
import type { Enums } from "@/types/database";

type InvoiceLike = {
  amount: number;
  discount: number;
  fine: number;
  interest: number;
  status: Enums<"invoice_status">;
  due_date: string;
};

export function invoiceTotal(i: Pick<InvoiceLike, "amount" | "discount" | "fine" | "interest">): number {
  return round2(i.amount - i.discount + i.fine + i.interest);
}

/** Situação exibida: "pendente" com vencimento passado vira "atrasado". */
export function displayStatus(i: Pick<InvoiceLike, "status" | "due_date">, today: string): InvoiceDisplayStatus {
  if (i.status === "pendente" && i.due_date < today) return "atrasado";
  return i.status;
}

export function daysOverdue(dueDate: string, today: string): number {
  return Math.max(0, diffDays(dueDate, today));
}

/**
 * Multa e juros por atraso (padrão de mercado no Brasil):
 * multa única de `finePercent`% e juros simples de `monthlyInterestPercent`% ao mês,
 * pro rata die (mês comercial de 30 dias), sobre o valor líquido.
 */
export function lateCharges(params: {
  amount: number;
  discount?: number;
  dueDate: string;
  payDate: string;
  finePercent: number;
  monthlyInterestPercent: number;
}): { days: number; fine: number; interest: number } {
  const days = daysOverdue(params.dueDate, params.payDate);
  if (days === 0) return { days: 0, fine: 0, interest: 0 };
  const base = Math.max(0, params.amount - (params.discount ?? 0));
  const fine = round2((base * params.finePercent) / 100);
  const interest = round2(((base * params.monthlyInterestPercent) / 100 / 30) * days);
  return { days, fine, interest };
}

/** Valor mensal equivalente de um plano (para MRR e ticket médio). */
export function monthlyEquivalent(price: number, discount: number, durationMonths: number): number {
  if (durationMonths <= 0) return 0;
  return round2((price - discount) / durationMonths);
}
