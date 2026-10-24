"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action, dbError, fail, ok } from "@/lib/action";
import { addMonths } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { budgetSchema, categorySchema, settleSchema, supplierSchema, transactionSchema } from "@/lib/validators/finance";

const refresh = () => revalidatePath("/financeiro", "layout");

export const saveTransaction = action("financeiro", transactionSchema.safeExtend({ id: z.uuid().optional() }), async (v) => {
  const supabase = await createClient();
  const { data: cat } = await supabase.from("financial_categories").select("type, nature").eq("id", v.category_id).single();
  if (!cat) return fail("Categoria inválida.");
  if (cat.type !== v.type) return fail("A categoria não corresponde ao tipo do lançamento.");
  const base = {
    type: v.type,
    category_id: v.category_id,
    supplier_id: v.supplier_id,
    description: v.description,
    amount: v.amount,
    nature: v.nature ?? cat.nature,
    payment_method: v.payment_method,
    document_number: v.document_number,
    notes: v.notes,
  };
  if (v.id) {
    const { data: current } = await supabase.from("transactions").select("payment_id").eq("id", v.id).single();
    if (current?.payment_id) return fail("Recebimentos de mensalidades são gerenciados em Mensalidades.");
    const { error } = await supabase
      .from("transactions")
      .update({ ...base, competence_date: v.competence_date, due_date: v.due_date, paid_date: v.paid_date, status: v.paid_date ? "pago" : "pendente" })
      .eq("id", v.id);
    if (error) return dbError(error);
    refresh();
    return ok(undefined, "Lançamento atualizado.");
  }
  const group = v.repeat_months > 1 ? crypto.randomUUID() : null;
  const rows = Array.from({ length: v.repeat_months }, (_, i) => ({
    ...base,
    description: v.repeat_months > 1 ? `${v.description} (${i + 1}/${v.repeat_months})` : v.description,
    competence_date: addMonths(v.competence_date, i),
    due_date: addMonths(v.due_date, i),
    paid_date: i === 0 ? v.paid_date : null,
    status: i === 0 && v.paid_date ? ("pago" as const) : ("pendente" as const),
    recurrence_group: group,
  }));
  const { error } = await supabase.from("transactions").insert(rows);
  if (error) return dbError(error);
  refresh();
  return ok(undefined, rows.length > 1 ? `${rows.length} lançamentos criados.` : "Lançamento criado.");
});

export const settleTransaction = action("financeiro", settleSchema, async ({ id, paid_date }) => {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").update({ status: "pago", paid_date }).eq("id", id).eq("status", "pendente");
  if (error) return dbError(error);
  refresh();
  return ok(undefined, "Lançamento liquidado.");
});

export const cancelTransaction = action("financeiro", z.object({ id: z.uuid() }), async ({ id }) => {
  const supabase = await createClient();
  const { data: t } = await supabase.from("transactions").select("payment_id").eq("id", id).single();
  if (t?.payment_id) return fail("Para cancelar um recebimento de mensalidade, estorne o pagamento em Mensalidades.");
  const { error } = await supabase.from("transactions").update({ status: "cancelado", paid_date: null }).eq("id", id);
  if (error) return dbError(error);
  refresh();
  return ok(undefined, "Lançamento cancelado.");
});

export const saveCategory = action("financeiro", categorySchema.safeExtend({ id: z.uuid().optional() }), async (v) => {
  const supabase = await createClient();
  const payload = { name: v.name, type: v.type, nature: v.nature, dre_group: v.dre_group, color: v.color };
  const { error } = v.id ? await supabase.from("financial_categories").update(payload).eq("id", v.id).eq("is_system", false) : await supabase.from("financial_categories").insert(payload);
  if (error) return dbError(error);
  refresh();
  return ok(undefined, "Categoria salva.");
});

export const toggleCategory = action("financeiro", z.object({ id: z.uuid(), active: z.boolean() }), async ({ id, active }) => {
  const supabase = await createClient();
  const { error } = await supabase.from("financial_categories").update({ active }).eq("id", id).eq("is_system", false);
  if (error) return dbError(error);
  refresh();
  return ok(undefined, active ? "Categoria ativada." : "Categoria desativada.");
});

export const saveSupplier = action("financeiro", supplierSchema.safeExtend({ id: z.uuid().optional() }), async (v) => {
  const supabase = await createClient();
  const payload = { name: v.name, document: v.document, email: v.email, phone: v.phone, category: v.category, notes: v.notes, active: v.active };
  const { error } = v.id ? await supabase.from("suppliers").update(payload).eq("id", v.id) : await supabase.from("suppliers").insert(payload);
  if (error) return dbError(error);
  refresh();
  return ok(undefined, "Fornecedor salvo.");
});

export const saveBudgets = action("financeiro", z.object({ items: z.array(budgetSchema).max(200) }), async ({ items }) => {
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").upsert(
    items.map((i) => ({ category_id: i.category_id, month: `${i.month.slice(0, 7)}-01`, amount: i.amount })),
    { onConflict: "gym_id,category_id,month" },
  );
  if (error) return dbError(error);
  refresh();
  return ok(undefined, "Orçamento salvo.");
});

export const copyBudget = action("financeiro", z.object({ from: z.string(), to: z.string() }), async ({ from, to }) => {
  const supabase = await createClient();
  const { data } = await supabase.from("budgets").select("category_id, amount").eq("month", `${from.slice(0, 7)}-01`);
  if (!data?.length) return fail("Não há orçamento no mês de origem.");
  const { error } = await supabase
    .from("budgets")
    .upsert(data.map((b) => ({ category_id: b.category_id, amount: b.amount, month: `${to.slice(0, 7)}-01` })), { onConflict: "gym_id,category_id,month" });
  if (error) return dbError(error);
  refresh();
  return ok(undefined, "Orçamento copiado.");
});
