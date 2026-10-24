import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { requireModule } from "@/lib/auth";
import { getBuilderOptions, getWorkoutPlan } from "@/lib/queries/training";
import { createClient } from "@/lib/supabase/server";
import { WorkoutBuilder } from "../../workout-builder";

export const metadata: Metadata = { title: "Editar ficha" };

export default async function EditWorkoutPage({ params }: PageProps<"/treinos/[id]/editar">) {
  await requireModule("treinos");
  const { id } = await params;
  const supabase = await createClient();
  const [plan, opts] = await Promise.all([getWorkoutPlan(supabase, id), getBuilderOptions(supabase)]);
  if (!plan) notFound();
  const students = opts.students.some((s) => s.id === plan.student_id)
    ? opts.students
    : [...opts.students, { id: plan.student_id, full_name: plan.students?.full_name ?? "Aluno" }];
  return (
    <>
      <PageHeader title="Editar ficha" description={`${plan.students?.full_name} · ${plan.title}`} />
      <WorkoutBuilder
        id={plan.id}
        {...opts}
        students={students}
        initial={{
          student_id: plan.student_id,
          teacher_id: plan.teacher_id ?? "",
          title: plan.title,
          goal: plan.goal ?? "",
          start_date: plan.start_date,
          end_date: plan.end_date ?? "",
          notes: plan.notes ?? "",
          divisions: plan.workout_divisions.map((d) => ({
            label: d.label,
            name: d.name ?? "",
            items: d.workout_exercises.map((e) => ({
              exercise_id: e.exercise_id,
              sets: e.sets,
              reps: e.reps,
              load_kg: e.load_kg ?? "",
              rest_seconds: e.rest_seconds ?? "",
              notes: e.notes ?? "",
            })),
          })),
        }}
      />
    </>
  );
}
