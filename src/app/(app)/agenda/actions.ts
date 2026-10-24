"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action, dbError, ok } from "@/lib/action";
import { localDateTimeToISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { eventSchema } from "@/lib/validators/admin";

export const saveEvent = action("agenda", eventSchema.safeExtend({ id: z.uuid().optional() }), async (v) => {
  const supabase = await createClient();
  const payload = {
    title: v.title,
    kind: v.kind,
    starts_at: localDateTimeToISO(v.starts_at),
    ends_at: localDateTimeToISO(v.ends_at),
    staff_id: v.staff_id,
    student_id: v.kind === "aula" ? null : v.student_id,
    location: v.location,
    capacity: v.kind === "aula" ? v.capacity : null,
    description: v.description,
  };
  const { error } = v.id ? await supabase.from("events").update(payload).eq("id", v.id) : await supabase.from("events").insert(payload);
  if (error) return dbError(error);
  revalidatePath("/agenda");
  return ok(undefined, "Compromisso salvo.");
});

export const setEventStatus = action("agenda", z.object({ id: z.uuid(), status: z.enum(["agendado", "concluido", "cancelado"]) }), async (v) => {
  const supabase = await createClient();
  const { error } = await supabase.from("events").update({ status: v.status }).eq("id", v.id);
  if (error) return dbError(error);
  revalidatePath("/agenda");
  return ok(undefined, "Situação atualizada.");
});

export const addAttendee = action("agenda", z.object({ event_id: z.uuid(), student_id: z.uuid({ error: "Selecione o aluno" }) }), async (v) => {
  const supabase = await createClient();
  const { error } = await supabase.from("event_attendees").insert(v);
  if (error) return error.code === "23505" ? dbError({ message: "Aluno já inscrito.", code: "P0001" }) : dbError(error);
  revalidatePath("/agenda");
  return ok(undefined, "Aluno inscrito.");
});

export const removeAttendee = action("agenda", z.object({ event_id: z.uuid(), student_id: z.uuid() }), async (v) => {
  const supabase = await createClient();
  const { error } = await supabase.from("event_attendees").delete().eq("event_id", v.event_id).eq("student_id", v.student_id);
  if (error) return dbError(error);
  revalidatePath("/agenda");
  return ok(undefined, "Inscrição removida.");
});
