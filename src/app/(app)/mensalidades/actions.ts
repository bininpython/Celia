"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action, dbError, fail, ok } from "@/lib/action";
import { localDateTimeToISO, todayISO } from "@/lib/dates";
import { invoiceTotal } from "@/lib/finance/invoice";
import { createClient } from "@/lib/supabase/server";
import {
  generateInvoicesSchema, invoiceSchema, paymentSchema, renegotiationSchema, reversalSchema,
} from "@/lib/validators/billing";

const refresh = (studentId?: string) => {
  revalidatePath("/mensalidades");
  if (studentId) revalidatePath(`/alunos/${studentId}`);
};

export const generateInvoices = action("mensalidades", generateInvoicesSchema, async ({ month }) => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_invoices", { p_month: month });
  if (error) return dbError(error);
  refresh();
  return ok(data, data ? `${data} mensalidade(s) gerada(s).` : "Nenhuma nova mensalidade a gerar para esta competência.");
});

export const createInvoice = action("mensalidades", invoiceSchema, async (v) => {
  const supabase = await createClient();
  const { error } = await supabase.from("invoices").insert({
    student_id: v.student_id,
    description: v.description,
    due_date: v.due_date,
    reference_month: `${v.due_date.slice(0, 7)}-01`,
    amount: v.amount,
    discount: v.discount,
    notes: v.notes,
  });
  if (error) return dbError(error);
  refresh(v.student_id);
  return ok(undefined, "Cobrança criada.");
});

/** Registra pagamento; ajustes de multa/juros/desconto são gravados na mensalidade antes. */
export const registerPayment = action("mensalidades", paymentSchema, async (v) => {
  const supabase = await createClient();
  const { data: inv, error: e1 } = await supabase.from("invoices").select("*").eq("id", v.invoice_id).single();
  if (e1 || !inv) return fail("Mensalidade não encontrada.");
  if (inv.status !== "pendente") return fail("Esta mensalidade não está pendente.");

  const adjusted = { ...inv, fine: v.fine, interest: v.interest, discount: v.discount };
  if (v.discount > inv.amount + v.fine + v.interest) return fail("Desconto maior que o valor devido.");
  if (adjusted.fine !== inv.fine || adjusted.interest !== inv.interest || adjusted.discount !== inv.discount) {
    const { error } = await supabase.from("invoices").update({ fine: v.fine, interest: v.interest, discount: v.discount }).eq("id", inv.id);
    if (error) return dbError(error);
  }
  const { data: paidSoFar } = await supabase.from("payments").select("amount").eq("invoice_id", inv.id).is("reversed_at", null);
  const remaining = invoiceTotal(adjusted) - (paidSoFar ?? []).reduce((a, p) => a + Number(p.amount), 0);
  if (v.amount - remaining > 0.009) return fail(`Valor acima do saldo devedor (${remaining.toFixed(2).replace(".", ",")}).`);

  const now = new Date();
  const paidAt = v.paid_on === todayISO() ? now.toISOString() : localDateTimeToISO(`${v.paid_on}T12:00`);
  const { data: pay, error } = await supabase
    .from("payments")
    .insert({ invoice_id: inv.id, amount: v.amount, method: v.method, paid_at: paidAt, notes: v.notes })
    .select("id, receipt_number")
    .single();
  if (error) return dbError(error);
  refresh(inv.student_id);
  return ok({ paymentId: pay.id, receipt: pay.receipt_number }, `Pagamento registrado — recibo nº ${pay.receipt_number}.`);
});

export const reversePayment = action("estornar", reversalSchema, async (v) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .update({ reversed_at: new Date().toISOString(), reversal_reason: v.reason })
    .eq("id", v.payment_id)
    .is("reversed_at", null)
    .select("student_id")
    .single();
  if (error) return dbError(error);
  refresh(data.student_id ?? undefined);
  return ok(undefined, "Pagamento estornado. A mensalidade voltou a ficar pendente.");
});

export const cancelInvoice = action("mensalidades", z.object({ id: z.uuid(), reason: z.string().trim().min(3, "Informe o motivo").max(300) }), async (v) => {
  const supabase = await createClient();
  const { data: paid } = await supabase.from("payments").select("id").eq("invoice_id", v.id).is("reversed_at", null).limit(1);
  if (paid?.length) return fail("Há pagamento registrado. Estorne-o antes de cancelar.");
  const { data, error } = await supabase
    .from("invoices")
    .update({ status: "cancelado", notes: `Cancelada: ${v.reason}` })
    .eq("id", v.id)
    .eq("status", "pendente")
    .select("student_id")
    .single();
  if (error) return dbError(error);
  refresh(data.student_id);
  return ok(undefined, "Mensalidade cancelada.");
});

export const renegotiate = action("renegociar", renegotiationSchema, async (v) => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("renegotiate_invoices", {
    p_invoice_ids: v.invoice_ids,
    p_installments: v.installments,
    p_first_due: v.first_due,
    p_total: v.total,
    p_notes: v.notes ?? undefined,
  });
  if (error) return dbError(error);
  refresh(data?.[0]?.student_id);
  return ok(undefined, `Renegociação registrada em ${v.installments} parcela(s).`);
});
