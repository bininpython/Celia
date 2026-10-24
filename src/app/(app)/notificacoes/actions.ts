"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action, dbError, ok } from "@/lib/action";
import { createClient } from "@/lib/supabase/server";

export const generateAlerts = action("notificacoes", z.object({}), async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_notifications", {});
  if (error) return dbError(error);
  revalidatePath("/notificacoes");
  return ok(undefined, data ? `${data} novo(s) alerta(s).` : "Nenhum alerta novo.");
});

export const markRead = action("notificacoes", z.object({ id: z.uuid().optional() }), async ({ id }) => {
  const supabase = await createClient();
  let q = supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("audience", "staff").is("read_at", null);
  if (id) q = q.eq("id", id);
  const { error } = await q;
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return ok(undefined, id ? "Marcada como lida." : "Todas marcadas como lidas.");
});
