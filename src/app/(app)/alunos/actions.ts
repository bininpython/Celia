"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action, dbError, fail, ok } from "@/lib/action";
import { getSessionUser } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { canAccess } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cancelMembershipSchema, membershipSchema } from "@/lib/validators/billing";
import { inviteSchema } from "@/lib/validators/admin";
import { healthSchema, studentSchema, studentStatusSchema } from "@/lib/validators/students";

const studentPayload = (v: z.output<typeof studentSchema>) => ({
  full_name: v.full_name,
  cpf: v.cpf,
  email: v.email,
  phone: v.phone,
  birth_date: v.birth_date,
  gender: v.gender,
  address: v.address,
  objective: v.objective,
  start_date: v.start_date,
  due_day: v.due_day,
  emergency_contact_name: v.emergency_contact_name,
  emergency_contact_phone: v.emergency_contact_phone,
  notes: v.notes,
  notifications_opt_in: v.notifications_opt_in,
});

export const createStudent = action("alunos_editar", studentSchema, async (v) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .insert({ ...studentPayload(v), lgpd_consent_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error) return dbError(error);
  revalidatePath("/alunos");
  return ok({ id: data.id }, "Aluno cadastrado.");
});

export const updateStudent = action(
  "alunos_editar",
  studentSchema.safeExtend({ id: z.uuid() }),
  async (v) => {
    const supabase = await createClient();
    const { data: current } = await supabase.from("students").select("lgpd_consent_at").eq("id", v.id).single();
    const { error } = await supabase
      .from("students")
      .update({ ...studentPayload(v), lgpd_consent_at: current?.lgpd_consent_at ?? new Date().toISOString() })
      .eq("id", v.id);
    if (error) return dbError(error);
    revalidatePath(`/alunos/${v.id}`);
    return ok({ id: v.id }, "Cadastro atualizado.");
  },
);

export const setStudentStatus = action("alunos_editar", studentStatusSchema, async ({ id, status }) => {
  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({ status, archived_at: status === "arquivado" ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return dbError(error);
  // Suspensão/arquivamento suspendem ou encerram a matrícula ativa
  if (status === "suspenso") await supabase.from("memberships").update({ status: "suspensa" }).eq("student_id", id).eq("status", "ativa");
  if (status === "ativo") await supabase.from("memberships").update({ status: "ativa" }).eq("student_id", id).eq("status", "suspensa");
  if (status === "arquivado" || status === "inativo")
    await supabase
      .from("memberships")
      .update({ status: "encerrada", end_date: todayISO() })
      .eq("student_id", id)
      .in("status", ["ativa", "suspensa"]);
  revalidatePath(`/alunos/${id}`);
  const labels = { ativo: "reativado", suspenso: "suspenso", inativo: "inativado", arquivado: "arquivado" };
  return ok(undefined, `Aluno ${labels[status]}.`);
});

export const deleteStudent = action("alunos_excluir", z.object({ id: z.uuid() }), async ({ id }) => {
  const supabase = await createClient();
  const { count } = await supabase.from("invoices").select("id", { count: "exact", head: true }).eq("student_id", id);
  if ((count ?? 0) > 0) {
    return fail(
      "Este aluno possui histórico financeiro, que deve ser mantido por obrigação legal. Use \"Anonimizar\" para eliminar os dados pessoais.",
    );
  }
  const { data: s } = await supabase.from("students").select("photo_path").eq("id", id).single();
  if (s?.photo_path) await supabase.storage.from("student-photos").remove([s.photo_path]);
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) return dbError(error);
  revalidatePath("/alunos");
  return ok(undefined, "Aluno excluído.");
});

export const anonymizeStudent = action("alunos_excluir", z.object({ id: z.uuid() }), async ({ id }) => {
  const supabase = await createClient();
  const { data: s } = await supabase.from("students").select("photo_path, user_id").eq("id", id).single();
  if (s?.photo_path) await supabase.storage.from("student-photos").remove([s.photo_path]);
  const { error } = await supabase.rpc("anonymize_student", { p_student: id });
  if (error) return dbError(error);
  if (s?.user_id) {
    try {
      await createAdminClient().auth.admin.deleteUser(s.user_id);
    } catch (e) {
      console.error("[anonymize] falha ao remover acesso", e);
    }
  }
  revalidatePath(`/alunos/${id}`);
  return ok(undefined, "Dados pessoais anonimizados. Registros financeiros foram preservados.");
});

export const saveHealth = action("saude", healthSchema, async (v) => {
  const supabase = await createClient();
  const { error } = await supabase.from("student_health").upsert({
    student_id: v.student_id,
    medical_conditions: v.medical_conditions,
    medications: v.medications,
    injuries: v.injuries,
    restrictions: v.restrictions,
    physician_clearance: v.physician_clearance,
    updated_at: new Date().toISOString(),
  });
  if (error) return dbError(error);
  // Consentimento específico para dado sensível
  const { error: consentErr } = await supabase.rpc("record_health_consent", { p_student: v.student_id });
  if (consentErr) return dbError(consentErr);
  revalidatePath(`/alunos/${v.student_id}`);
  return ok(undefined, "Informações de saúde salvas.");
});

export const createMembership = action("alunos_editar", membershipSchema, async (v) => {
  const supabase = await createClient();
  const { data: plan } = await supabase.from("plans").select("name, active").eq("id", v.plan_id).single();
  if (!plan?.active) return fail("Plano inativo ou inexistente.");
  const { data, error } = await supabase
    .from("memberships")
    .insert({
      student_id: v.student_id,
      plan_id: v.plan_id,
      start_date: v.start_date,
      end_date: v.end_date,
      price: v.price,
      discount: v.discount,
      auto_renew: v.auto_renew,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return fail("O aluno já possui uma matrícula ativa. Cancele-a antes de criar outra.");
    return dbError(error);
  }
  if (v.generate_first_invoice && v.price - v.discount > 0) {
    const { error: invErr } = await supabase.from("invoices").insert({
      student_id: v.student_id,
      membership_id: data.id,
      description: `Plano ${plan.name} — ${v.start_date.slice(5, 7)}/${v.start_date.slice(0, 4)}`,
      reference_month: `${v.start_date.slice(0, 7)}-01`,
      due_date: v.start_date,
      amount: v.price,
      discount: v.discount,
    });
    if (invErr) return dbError(invErr);
  }
  await supabase.from("students").update({ status: "ativo" }).eq("id", v.student_id).in("status", ["inativo"]);
  revalidatePath(`/alunos/${v.student_id}`);
  return ok({ id: data.id }, "Matrícula registrada.");
});

export const cancelMembership = action("alunos_editar", cancelMembershipSchema, async (v) => {
  const supabase = await createClient();
  const { data: m, error } = await supabase
    .from("memberships")
    .update({ status: "cancelada", canceled_at: new Date().toISOString(), cancel_reason: v.reason, end_date: todayISO() })
    .eq("id", v.id)
    .select("student_id")
    .single();
  if (error) return dbError(error);
  if (v.cancel_open_invoices) {
    await supabase
      .from("invoices")
      .update({ status: "cancelado", notes: `Cancelada com a matrícula: ${v.reason}` })
      .eq("membership_id", v.id)
      .eq("status", "pendente")
      .gte("due_date", todayISO());
  }
  revalidatePath(`/alunos/${m.student_id}`);
  return ok(undefined, "Matrícula cancelada.");
});

/** Cria o acesso do aluno ao portal (Supabase Auth Admin API). */
export const createStudentAccess = action("alunos_editar", inviteSchema.required({ student_id: true }), async (v, user) => {
  const supabase = await createClient();
  const { data: s } = await supabase.from("students").select("id, full_name, user_id").eq("id", v.student_id!).single();
  if (!s) return fail("Aluno não encontrado.");
  if (s.user_id) return fail("Este aluno já possui acesso ao portal.");
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: v.email,
    password: v.password,
    email_confirm: true,
    user_metadata: { full_name: s.full_name },
    app_metadata: { role: "aluno", student_id: s.id, gym_id: user.gymId },
  });
  if (error) return fail(error.message.includes("already") ? "Já existe um usuário com este e-mail." : error.message);
  await supabase.from("students").update({ email: v.email }).eq("id", s.id).is("email", null);
  revalidatePath(`/alunos/${s.id}`);
  return ok(undefined, "Acesso criado. Informe ao aluno o e-mail e a senha provisória.");
});

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadStudentPhoto(formData: FormData) {
  const user = await getSessionUser();
  if (!user || !canAccess(user.role, "alunos_editar")) return fail("Sem permissão.");
  const id = z.uuid().safeParse(formData.get("student_id"));
  const file = formData.get("photo");
  if (!id.success || !(file instanceof File)) return fail("Arquivo inválido.");
  if (!PHOTO_TYPES.includes(file.type)) return fail("Use imagens JPG, PNG ou WEBP.");
  if (file.size > 2 * 1024 * 1024) return fail("A foto deve ter no máximo 2 MB.");
  const supabase = await createClient();
  const ext = file.type.split("/")[1];
  const path = `${user.gymId}/${id.data}/foto-${Date.now()}.${ext}`;
  const { data: current } = await supabase.from("students").select("photo_path").eq("id", id.data).single();
  const { error } = await supabase.storage.from("student-photos").upload(path, file, { contentType: file.type });
  if (error) return fail(`Falha no envio: ${error.message}`);
  const { error: upErr } = await supabase.from("students").update({ photo_path: path }).eq("id", id.data);
  if (upErr) return dbError(upErr);
  if (current?.photo_path) await supabase.storage.from("student-photos").remove([current.photo_path]);
  revalidatePath(`/alunos/${id.data}`);
  return ok(undefined, "Foto atualizada.");
}
