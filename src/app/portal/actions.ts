"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action, dbError, fail, ok } from "@/lib/action";
import { createCheckinToken } from "@/lib/checkin-token";
import { serverSecret } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { contactSchema } from "@/lib/validators/admin";
import { workoutLogSchema } from "@/lib/validators/training";

/** Aluno registra execução do próprio treino (RLS garante que seja o próprio). */
export const logMyWorkout = action("portal", workoutLogSchema, async (v, user) => {
  if (!user.studentId) return fail("Cadastro de aluno não vinculado.");
  const supabase = await createClient();
  const { data: we } = await supabase.from("workout_exercises").select("exercise_id").eq("id", v.workout_exercise_id).single();
  if (!we) return fail("Exercício não encontrado na sua ficha.");
  const { error } = await supabase.from("workout_logs").insert({
    student_id: user.studentId,
    workout_exercise_id: v.workout_exercise_id,
    exercise_id: we.exercise_id,
    performed_on: v.performed_on,
    sets_done: v.sets_done,
    reps_done: v.reps_done,
    load_kg: v.load_kg,
    notes: v.notes,
  });
  if (error) return dbError(error);
  revalidatePath("/portal/treinos");
  return ok(undefined, "Treino registrado. Bom trabalho!");
});

export const updateMyContact = action("portal", contactSchema, async (v) => {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_my_contact", {
    p_phone: v.phone as string,
    p_email: v.email as string,
    p_address: v.address as string,
    p_emergency_name: v.emergency_contact_name as string,
    p_emergency_phone: v.emergency_contact_phone as string,
    p_notifications: v.notifications_opt_in,
  });
  if (error) return dbError(error);
  revalidatePath("/portal/perfil");
  return ok(undefined, "Dados atualizados.");
});

export const getCheckinToken = action("portal", z.object({}), async (_v, user) => {
  if (!user.studentId) return fail("Cadastro de aluno não vinculado.");
  return ok(createCheckinToken(user.studentId, user.gymId, serverSecret("CHECKIN_TOKEN_SECRET")));
});

export const toggleClass = action("portal", z.object({ event_id: z.uuid(), join: z.boolean() }), async (v, user) => {
  if (!user.studentId) return fail("Cadastro de aluno não vinculado.");
  const supabase = await createClient();
  const { error } = v.join
    ? await supabase.from("event_attendees").insert({ event_id: v.event_id, student_id: user.studentId })
    : await supabase.from("event_attendees").delete().eq("event_id", v.event_id).eq("student_id", user.studentId);
  if (error) return dbError(error);
  revalidatePath("/portal/agenda");
  return ok(undefined, v.join ? "Inscrição confirmada." : "Inscrição cancelada.");
});

export const readMyNotifications = action("portal", z.object({}), async () => {
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("audience", "student").is("read_at", null);
  if (error) return dbError(error);
  revalidatePath("/portal", "layout");
  return ok(undefined, "Avisos marcados como lidos.");
});
