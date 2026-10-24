import "server-only";
import type { ServerSupabase } from "@/lib/supabase/server";

export async function getWorkoutPlan(supabase: ServerSupabase, id: string) {
  const { data } = await supabase
    .from("workout_plans")
    .select(
      "*, students(id, full_name, enrollment_code), workout_divisions(id, label, name, position, workout_exercises(id, position, sets, reps, load_kg, rest_seconds, notes, exercise_id, exercises(name, muscle_group, equipment, instructions, video_url)))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const divisions = [...data.workout_divisions]
    .sort((a, b) => a.position - b.position)
    .map((d) => ({ ...d, workout_exercises: [...d.workout_exercises].sort((a, b) => a.position - b.position) }));
  return { ...data, workout_divisions: divisions };
}

export type WorkoutPlanFull = NonNullable<Awaited<ReturnType<typeof getWorkoutPlan>>>;

export async function getBuilderOptions(supabase: ServerSupabase) {
  const [students, teachers, exercises] = await Promise.all([
    supabase.from("students").select("id, full_name").eq("status", "ativo").order("full_name"),
    supabase.from("staff_directory").select("id, full_name, role").eq("active", true).in("role", ["professor", "gerente", "admin"]).order("full_name"),
    supabase.from("exercises").select("id, name, muscle_group").eq("active", true).order("name"),
  ]);
  return {
    students: students.data ?? [],
    teachers: (teachers.data ?? []).filter((t): t is typeof t & { id: string; full_name: string } => !!t.id && !!t.full_name),
    exercises: exercises.data ?? [],
  };
}
