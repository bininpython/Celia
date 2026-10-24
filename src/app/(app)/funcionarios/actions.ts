"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action, dbError, fail, ok } from "@/lib/action";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { inviteSchema, profileRoleSchema, staffSchema } from "@/lib/validators/admin";

export const saveStaff = action("funcionarios", staffSchema.safeExtend({ id: z.uuid().optional() }), async (v, user) => {
  if (v.role === "admin" && user.role !== "admin") return fail("Somente administradores podem cadastrar administradores.");
  const supabase = await createClient();
  const payload = {
    full_name: v.full_name,
    email: v.email,
    phone: v.phone,
    cpf: v.cpf,
    role: v.role,
    position: v.position,
    hire_date: v.hire_date,
    salary: v.salary,
    responsibilities: v.responsibilities,
    schedule: v.schedule_text ? { texto: v.schedule_text } : {},
    active: v.active,
    notes: v.notes,
  };
  const { data, error } = v.id
    ? await supabase.from("staff").update(payload).eq("id", v.id).select("profile_id").single()
    : await supabase.from("staff").insert(payload).select("profile_id").single();
  if (error) return dbError(error);
  // Mantém o perfil de acesso coerente com o cadastro
  if (data.profile_id && user.role === "admin") {
    await supabase.from("profiles").update({ role: v.role, active: v.active, full_name: v.full_name }).eq("id", data.profile_id);
  }
  revalidatePath("/funcionarios");
  return ok(undefined, "Funcionário salvo.");
});

export const createStaffAccess = action("configuracoes", inviteSchema.required({ staff_id: true }), async (v, user) => {
  const supabase = await createClient();
  const { data: s } = await supabase.from("staff").select("id, full_name, role, profile_id").eq("id", v.staff_id!).single();
  if (!s) return fail("Funcionário não encontrado.");
  if (s.profile_id) return fail("Este funcionário já possui acesso.");
  const { error } = await createAdminClient().auth.admin.createUser({
    email: v.email,
    password: v.password,
    email_confirm: true,
    user_metadata: { full_name: s.full_name },
    app_metadata: { role: s.role, staff_id: s.id, gym_id: user.gymId },
  });
  if (error) return fail(error.message.includes("already") ? "Já existe um usuário com este e-mail." : error.message);
  await supabase.from("staff").update({ email: v.email }).eq("id", s.id);
  revalidatePath("/funcionarios");
  return ok(undefined, "Acesso criado. Oriente o funcionário a trocar a senha no primeiro acesso.");
});

export const updateProfileAccess = action("configuracoes", profileRoleSchema, async (v, user) => {
  if (v.id === user.id && (v.role !== "admin" || !v.active)) return fail("Você não pode remover o seu próprio acesso de administrador.");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role: v.role, active: v.active }).eq("id", v.id);
  if (error) return dbError(error);
  if (v.role !== "aluno") await supabase.from("staff").update({ role: v.role, active: v.active }).eq("profile_id", v.id);
  // Perfil inativo deixa de ter academia (current_gym_id) e perde acesso a todos os dados via RLS.
  revalidatePath("/funcionarios");
  return ok(undefined, "Acesso atualizado.");
});
