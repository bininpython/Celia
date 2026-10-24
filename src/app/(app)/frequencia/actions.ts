"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action, dbError, fail, ok } from "@/lib/action";
import { verifyCheckinToken } from "@/lib/checkin-token";
import { serverSecret } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type CheckinResult = { name: string; overdue: number };

async function insertCheckin(studentId: string, method: "recepcao" | "matricula" | "qrcode") {
  const supabase = await createClient();
  const { data: s } = await supabase.from("students").select("id, full_name").eq("id", studentId).maybeSingle();
  if (!s) return fail("Aluno não encontrado.");
  const { error } = await supabase.from("checkins").insert({ student_id: s.id, method });
  if (error) return dbError(error);
  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("student_id", s.id)
    .eq("status", "pendente")
    .lt("due_date", new Date().toISOString().slice(0, 10));
  revalidatePath("/frequencia");
  return ok<CheckinResult>({ name: s.full_name, overdue: count ?? 0 }, `Check-in registrado: ${s.full_name}`);
}

export const checkinStudent = action("frequencia", z.object({ student_id: z.uuid({ error: "Selecione o aluno" }) }), async (v) =>
  insertCheckin(v.student_id, "recepcao"),
);

export const checkinByCode = action("frequencia", z.object({ code: z.string().trim().min(2, "Informe a matrícula").max(20) }), async (v) => {
  const supabase = await createClient();
  const { data } = await supabase.from("students").select("id").ilike("enrollment_code", v.code.toUpperCase()).maybeSingle();
  if (!data) return fail("Matrícula não encontrada.");
  return insertCheckin(data.id, "matricula");
});

export const checkinByToken = action("frequencia", z.object({ token: z.string().trim().min(10).max(400) }), async (v, user) => {
  const check = verifyCheckinToken(v.token, serverSecret("CHECKIN_TOKEN_SECRET"));
  if (!check.valid) {
    const reasons = { formato: "QR Code inválido.", assinatura: "QR Code não reconhecido.", expirado: "QR Code expirado. Peça ao aluno para atualizar a tela." };
    return fail(reasons[check.reason]);
  }
  if (check.gymId !== user.gymId) return fail("QR Code de outra unidade.");
  return insertCheckin(check.studentId, "qrcode");
});

export const deleteCheckin = action("frequencia", z.object({ id: z.uuid() }), async ({ id }) => {
  const supabase = await createClient();
  const { error, count } = await supabase.from("checkins").delete({ count: "exact" }).eq("id", id);
  if (error) return dbError(error);
  if (!count) return fail("Somente gestores podem remover check-ins.");
  revalidatePath("/frequencia");
  return ok(undefined, "Check-in removido.");
});
