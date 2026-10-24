import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { requireModule } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StudentForm } from "../../student-form";

export const metadata: Metadata = { title: "Editar aluno" };

export default async function EditStudentPage({ params }: PageProps<"/alunos/[id]/editar">) {
  await requireModule("alunos_editar");
  const { id } = await params;
  const supabase = await createClient();
  const { data: s } = await supabase.from("students").select("*").eq("id", id).maybeSingle();
  if (!s) notFound();
  return (
    <>
      <PageHeader title="Editar aluno" description={`${s.full_name} · matrícula ${s.enrollment_code}`} />
      <StudentForm
        id={s.id}
        defaultDueDay={s.due_day}
        initial={{
          full_name: s.full_name,
          cpf: s.cpf ?? "",
          email: s.email ?? "",
          phone: s.phone ?? "",
          birth_date: s.birth_date ?? "",
          gender: s.gender ?? "",
          address: s.address ?? "",
          objective: s.objective ?? "",
          start_date: s.start_date,
          due_day: s.due_day,
          emergency_contact_name: s.emergency_contact_name ?? "",
          emergency_contact_phone: s.emergency_contact_phone ?? "",
          notes: s.notes ?? "",
          lgpd_consent: !!s.lgpd_consent_at,
          notifications_opt_in: s.notifications_opt_in,
        }}
      />
    </>
  );
}
