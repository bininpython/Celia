"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action, dbError, ok } from "@/lib/action";
import { createClient } from "@/lib/supabase/server";
import { planSchema } from "@/lib/validators/billing";

export const savePlan = action("planos_editar", planSchema.and(z.object({ id: z.uuid().optional() })), async (v) => {
  const supabase = await createClient();
  const payload = {
    name: v.name,
    periodicity: v.periodicity,
    duration_months: v.duration_months,
    price: v.price,
    weekly_frequency: v.weekly_frequency,
    description: v.description,
    active: v.active,
  };
  const { error } = v.id ? await supabase.from("plans").update(payload).eq("id", v.id) : await supabase.from("plans").insert(payload);
  if (error) return dbError(error);
  revalidatePath("/planos");
  return ok(undefined, v.id ? "Plano atualizado." : "Plano criado. Matrículas existentes mantêm o valor contratado.");
});

export const togglePlan = action("planos_editar", z.object({ id: z.uuid(), active: z.boolean() }), async ({ id, active }) => {
  const supabase = await createClient();
  const { error } = await supabase.from("plans").update({ active }).eq("id", id);
  if (error) return dbError(error);
  revalidatePath("/planos");
  return ok(undefined, active ? "Plano ativado." : "Plano desativado para novas matrículas.");
});
