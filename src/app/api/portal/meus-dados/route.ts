import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Portabilidade (LGPD art. 18, V): exporta os dados do próprio aluno. RLS limita ao titular. */
export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "aluno" || !user.studentId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const supabase = await createClient();
  const id = user.studentId;
  const [student, health, memberships, invoices, payments, checkins, workouts, logs] = await Promise.all([
    supabase.from("students").select("*").eq("id", id).single(),
    supabase.from("student_health").select("*").eq("student_id", id).maybeSingle(),
    supabase.from("memberships").select("*, plans(name)").eq("student_id", id),
    supabase.from("invoices").select("*").eq("student_id", id),
    supabase.from("payments").select("*").eq("student_id", id),
    supabase.from("checkins").select("checked_in_at, method").eq("student_id", id),
    supabase.from("workout_plans").select("*, workout_divisions(*, workout_exercises(*, exercises(name)))").eq("student_id", id),
    supabase.from("workout_logs").select("*, exercises(name)").eq("student_id", id),
  ]);
  const body = {
    exportado_em: new Date().toISOString(),
    academia: user.gymName,
    cadastro: student.data,
    saude: health.data,
    matriculas: memberships.data,
    mensalidades: invoices.data,
    pagamentos: payments.data,
    frequencia: checkins.data,
    fichas_de_treino: workouts.data,
    registros_de_treino: logs.data,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="meus-dados-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
