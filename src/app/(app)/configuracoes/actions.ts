"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action, dbError, fail, ok } from "@/lib/action";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { gymSettingsSchema } from "@/lib/validators/admin";

export const saveGymSettings = action("configuracoes", gymSettingsSchema, async (v, user) => {
  const supabase = await createClient();
  const hours = Object.fromEntries(
    (v.opening_hours_text ?? "")
      .split("\n")
      .map((l) => l.split(":").map((s) => s.trim()))
      .filter((p) => p.length >= 2 && p[0])
      .map(([k, ...rest]) => [k!, rest.join(":")]),
  );
  const { opening_hours_text, ...rest } = v;
  void opening_hours_text;
  const { error } = await supabase.from("gyms").update({ ...rest, opening_hours: hours }).eq("id", user.gymId);
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return ok(undefined, "Configurações salvas.");
});

const HEX = /^#[0-9a-fA-F]{6}$/;
export const saveBrandColor = action("configuracoes", z.object({ color: z.string().regex(HEX, "Cor inválida") }), async ({ color }, user) => {
  const supabase = await createClient();
  const { error } = await supabase.from("gyms").update({ primary_color: color.toUpperCase() }).eq("id", user.gymId);
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return ok(undefined, "Cor da marca atualizada.");
});

export async function uploadLogo(formData: FormData) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return fail("Sem permissão.");
  const file = formData.get("logo");
  if (!(file instanceof File)) return fail("Arquivo inválido.");
  if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) return fail("Use PNG, JPG, WEBP ou SVG.");
  if (file.size > 2 * 1024 * 1024) return fail("Máximo de 2 MB.");
  const supabase = await createClient();
  const path = `${user.gymId}/logo-${Date.now()}.${file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1]}`;
  const { error } = await supabase.storage.from("gym-assets").upload(path, file, { contentType: file.type });
  if (error) return fail(`Falha no envio: ${error.message}`);
  const { data: old } = await supabase.from("gyms").select("logo_path").eq("id", user.gymId).single();
  const { error: e2 } = await supabase.from("gyms").update({ logo_path: path }).eq("id", user.gymId);
  if (e2) return dbError(e2);
  if (old?.logo_path) await supabase.storage.from("gym-assets").remove([old.logo_path]);
  revalidatePath("/", "layout");
  return ok(undefined, "Logo atualizada.");
}
