"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action, dbError, fail, ok } from "@/lib/action";
import { todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { investmentSchema } from "@/lib/validators/finance";

/**
 * Ao marcar como "executado", lança a saída no financeiro (categoria
 * Investimentos), uma única vez por investimento.
 */
export const saveInvestment = action("investimentos", investmentSchema.safeExtend({ id: z.uuid().optional() }), async (v) => {
  const supabase = await createClient();
  const payload = {
    name: v.name,
    kind: v.kind,
    amount: v.amount,
    invested_at: v.invested_at ?? (v.status === "executado" ? todayISO() : null),
    expected_monthly_return: v.expected_monthly_return,
    expected_monthly_cost: v.expected_monthly_cost,
    useful_life_months: v.useful_life_months,
    status: v.status,
    notes: v.notes,
  };
  const { data, error } = v.id
    ? await supabase.from("investments").update(payload).eq("id", v.id).select("id, invested_at").single()
    : await supabase.from("investments").insert(payload).select("id, invested_at").single();
  if (error) return dbError(error);

  if (v.status === "executado") {
    const { data: existing } = await supabase.from("transactions").select("id").eq("investment_id", data.id).neq("status", "cancelado").limit(1);
    if (!existing?.length) {
      const { data: cat } = await supabase.from("financial_categories").select("id").eq("name", "Investimentos").eq("is_system", true).single();
      if (!cat) return fail("Categoria de sistema 'Investimentos' não encontrada.");
      const date = data.invested_at ?? todayISO();
      const { error: txErr } = await supabase.from("transactions").insert({
        type: "despesa",
        category_id: cat.id,
        investment_id: data.id,
        description: `Investimento: ${v.name}`,
        amount: v.amount,
        competence_date: date,
        due_date: date,
        paid_date: date,
        status: "pago",
        nature: "variavel",
      });
      if (txErr) return dbError(txErr);
    }
  }
  if (v.status === "cancelado") {
    await supabase.from("transactions").update({ status: "cancelado", paid_date: null }).eq("investment_id", data.id);
  }
  revalidatePath("/investimentos");
  revalidatePath("/financeiro", "layout");
  return ok(undefined, v.status === "executado" ? "Investimento salvo e lançado no financeiro." : "Investimento salvo.");
});
