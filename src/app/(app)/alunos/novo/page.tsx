import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requireModule } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StudentForm } from "../student-form";

export const metadata: Metadata = { title: "Novo aluno" };

export default async function NewStudentPage() {
  await requireModule("alunos_editar");
  const supabase = await createClient();
  const { data: gym } = await supabase.from("gyms").select("default_due_day").single();
  return (
    <>
      <PageHeader title="Novo aluno" description="Cadastre o aluno e, em seguida, defina o plano e a matrícula." />
      <StudentForm defaultDueDay={gym?.default_due_day ?? 10} />
    </>
  );
}
