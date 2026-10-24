"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action, dbError, ok } from "@/lib/action";
import { createClient } from "@/lib/supabase/server";
import { exerciseSchema } from "@/lib/validators/training";

export const saveExercise = action("exercicios", exerciseSchema.safeExtend({ id: z.uuid().optional() }), async (v) => {
  const supabase = await createClient();
  const payload = { name: v.name, muscle_group: v.muscle_group, equipment: v.equipment, instructions: v.instructions, video_url: v.video_url };
  const { error } = v.id ? await supabase.from("exercises").update(payload).eq("id", v.id) : await supabase.from("exercises").insert(payload);
  if (error) return dbError(error);
  revalidatePath("/exercicios");
  return ok(undefined, "Exercício salvo.");
});

export const toggleExercise = action("exercicios", z.object({ id: z.uuid(), active: z.boolean() }), async ({ id, active }) => {
  const supabase = await createClient();
  const { error } = await supabase.from("exercises").update({ active }).eq("id", id);
  if (error) return dbError(error);
  revalidatePath("/exercicios");
  return ok(undefined, active ? "Exercício reativado." : "Exercício desativado (continua nas fichas existentes).");
});
