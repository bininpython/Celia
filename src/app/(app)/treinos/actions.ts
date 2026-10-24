"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action, dbError, ok } from "@/lib/action";
import { createClient } from "@/lib/supabase/server";
import { workoutLogSchema, workoutPlanSchema } from "@/lib/validators/training";

export const saveWorkoutPlan = action("treinos", workoutPlanSchema.safeExtend({ id: z.uuid().optional() }), async (v) => {
  const supabase = await createClient();
  const { id, ...data } = v;
  const { data: planId, error } = await supabase.rpc("save_workout_plan", { p_id: id ?? (null as unknown as string), p_data: data });
  if (error) return dbError(error);
  revalidatePath("/treinos");
  revalidatePath(`/alunos/${v.student_id}`);
  return ok({ id: planId }, id ? "Ficha atualizada." : "Ficha criada. Fichas anteriores do aluno foram encerradas.");
});

export const setWorkoutActive = action("treinos", z.object({ id: z.uuid(), active: z.boolean() }), async ({ id, active }) => {
  const supabase = await createClient();
  const { error } = await supabase.from("workout_plans").update({ active, end_date: active ? null : new Date().toISOString().slice(0, 10) }).eq("id", id);
  if (error) return dbError(error);
  revalidatePath(`/treinos/${id}`);
  return ok(undefined, active ? "Ficha reativada." : "Ficha encerrada.");
});

export const deleteWorkoutPlan = action("treinos", z.object({ id: z.uuid() }), async ({ id }) => {
  const supabase = await createClient();
  const { error } = await supabase.from("workout_plans").delete().eq("id", id);
  if (error) return dbError(error);
  revalidatePath("/treinos");
  return ok(undefined, "Ficha excluída.");
});

/** Registro de execução feito pelo professor em nome do aluno. */
export const logWorkoutAsTrainer = action("treinos", workoutLogSchema.safeExtend({ student_id: z.uuid() }), async (v) => {
  const supabase = await createClient();
  const { data: we } = await supabase.from("workout_exercises").select("exercise_id").eq("id", v.workout_exercise_id).single();
  if (!we) return dbError({ message: "Exercício da ficha não encontrado." });
  const { error } = await supabase.from("workout_logs").insert({
    student_id: v.student_id,
    workout_exercise_id: v.workout_exercise_id,
    exercise_id: we.exercise_id,
    performed_on: v.performed_on,
    sets_done: v.sets_done,
    reps_done: v.reps_done,
    load_kg: v.load_kg,
    notes: v.notes,
  });
  if (error) return dbError(error);
  revalidatePath("/treinos");
  return ok(undefined, "Execução registrada.");
});
