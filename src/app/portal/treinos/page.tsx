import type { Metadata } from "next";
import { Dumbbell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { WorkoutSheet } from "@/components/training/workout-sheet";
import { ProgressPanel } from "@/components/training/progress-panel";
import { requireModule } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { getWorkoutPlan } from "@/lib/queries/training";
import { createClient } from "@/lib/supabase/server";
import { MyLogButton } from "../portal-client";

export const metadata: Metadata = { title: "Meus treinos" };

export default async function MyWorkoutsPage() {
  const user = await requireModule("portal");
  const supabase = await createClient();
  const { data: plans } = await supabase.from("workout_plans").select("id, title, start_date, end_date, active").eq("student_id", user.studentId!).order("start_date", { ascending: false });
  const current = plans?.find((p) => p.active);
  const [plan, logs] = await Promise.all([
    current ? getWorkoutPlan(supabase, current.id) : Promise.resolve(null),
    supabase.from("workout_logs").select("id, exercise_id, workout_exercise_id, performed_on, load_kg, reps_done, sets_done, exercises(name)").eq("student_id", user.studentId!).order("performed_on", { ascending: false }).limit(500),
  ]);
  const lastLoads = new Map<string, number>();
  (logs.data ?? []).forEach((l) => l.workout_exercise_id && l.load_kg != null && !lastLoads.has(l.workout_exercise_id) && lastLoads.set(l.workout_exercise_id, Number(l.load_kg)));

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Meus treinos</h1>
        {plan && (
          <p className="text-sm text-muted-foreground">
            {plan.title} · desde {formatDate(plan.start_date)}
            {plan.end_date && ` · revisão ${formatDate(plan.end_date)}`}
          </p>
        )}
      </div>
      {!plan ? (
        <EmptyState icon={Dumbbell} title="Nenhuma ficha ativa" description="Seu professor ainda não cadastrou uma ficha de treino." />
      ) : (
        <>
          {plan.notes && <p className="rounded-lg bg-muted/60 p-3 text-sm">{plan.notes}</p>}
          <WorkoutSheet
            divisions={plan.workout_divisions}
            lastLoads={lastLoads}
            renderAction={(it) => (
              <MyLogButton item={{ id: it.id, name: it.exercises?.name ?? "", sets: it.sets, reps: it.reps, load_kg: it.load_kg != null ? Number(it.load_kg) : null }} />
            )}
          />
        </>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Minha evolução</CardTitle>
            <CardDescription>Carga registrada por exercício</CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressPanel
              logs={(logs.data ?? []).map((l) => ({ exercise_id: l.exercise_id, exercise: l.exercises?.name ?? "", performed_on: l.performed_on, load_kg: l.load_kg != null ? Number(l.load_kg) : null }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
          </CardHeader>
          <CardContent className="max-h-80 space-y-2 overflow-y-auto text-sm">
            {!logs.data?.length && <p className="text-muted-foreground">Registre seus treinos para acompanhar a evolução.</p>}
            {(logs.data ?? []).slice(0, 40).map((l) => (
              <div key={l.id} className="flex justify-between gap-3 border-b pb-2 last:border-0">
                <span>{l.exercises?.name}</span>
                <span className="text-right whitespace-nowrap text-muted-foreground">
                  {formatDate(l.performed_on)} · {l.sets_done ?? "—"}×{l.reps_done ?? "—"}
                  {l.load_kg != null && ` · ${formatNumber(Number(l.load_kg))} kg`}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      {(plans?.length ?? 0) > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Fichas anteriores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            {plans!
              .filter((p) => !p.active)
              .map((p) => (
                <p key={p.id}>
                  {p.title} · {formatDate(p.start_date)} a {formatDate(p.end_date)}
                </p>
              ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}
