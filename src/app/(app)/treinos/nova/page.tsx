import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requireModule } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { getBuilderOptions } from "@/lib/queries/training";
import { createClient } from "@/lib/supabase/server";
import { WorkoutBuilder } from "../workout-builder";

export const metadata: Metadata = { title: "Nova ficha" };

export default async function NewWorkoutPage({ searchParams }: PageProps<"/treinos/nova">) {
  const user = await requireModule("treinos");
  const sp = await searchParams;
  const supabase = await createClient();
  const opts = await getBuilderOptions(supabase);
  const { data: me } = await supabase.from("staff").select("id").eq("profile_id", user.id).maybeSingle();
  const studentId = typeof sp.aluno === "string" ? sp.aluno : "";
  return (
    <>
      <PageHeader title="Nova ficha de treino" description="Ao salvar, a ficha ativa anterior do aluno é encerrada automaticamente." />
      <WorkoutBuilder
        {...opts}
        initial={{
          student_id: opts.students.some((s) => s.id === studentId) ? studentId : "",
          teacher_id: me?.id ?? "",
          title: "",
          goal: "",
          start_date: todayISO(),
          end_date: "",
          notes: "",
          divisions: [{ label: "A", name: "", items: [{ exercise_id: "", sets: 3, reps: "10-12", load_kg: "", rest_seconds: 60, notes: "" }] }],
        }}
      />
    </>
  );
}
