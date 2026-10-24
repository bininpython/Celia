import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkoutSheet } from "@/components/training/workout-sheet";
import { ProgressPanel } from "@/components/training/progress-panel";
import { requireModule } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { getWorkoutPlan } from "@/lib/queries/training";
import { createClient } from "@/lib/supabase/server";
import { TrainerLogButton, WorkoutActions } from "./detail-client";

export const metadata: Metadata = { title: "Ficha de treino" };

export default async function WorkoutPage({ params }: PageProps<"/treinos/[id]">) {
  await requireModule("treinos");
  const { id } = await params;
  const supabase = await createClient();
  const plan = await getWorkoutPlan(supabase, id);
  if (!plan) notFound();
  const { data: logs } = await supabase
    .from("workout_logs")
    .select("id, exercise_id, workout_exercise_id, performed_on, load_kg, reps_done, sets_done, notes, exercises(name)")
    .eq("student_id", plan.student_id)
    .order("performed_on", { ascending: false })
    .limit(500);
  const lastLoads = new Map<string, number>();
  (logs ?? []).forEach((l) => l.workout_exercise_id && l.load_kg != null && !lastLoads.has(l.workout_exercise_id) && lastLoads.set(l.workout_exercise_id, Number(l.load_kg)));

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{plan.title}</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/alunos/${plan.student_id}`} className="hover:text-primary">
              {plan.students?.full_name}
            </Link>
            · início {formatDate(plan.start_date)}
            {plan.end_date && <> · revisão {formatDate(plan.end_date)}</>}
            {plan.active ? <Badge tone="success">Ativa</Badge> : <Badge>Encerrada</Badge>}
          </p>
        </div>
        <WorkoutActions id={plan.id} active={plan.active} />
      </div>
      {(plan.goal || plan.notes) && (
        <Card className="gap-2 py-4">
          <CardContent className="space-y-1 px-4 text-sm">
            {plan.goal && (
              <p>
                <span className="text-muted-foreground">Objetivo:</span> {plan.goal}
              </p>
            )}
            {plan.notes && <p className="text-muted-foreground">{plan.notes}</p>}
          </CardContent>
        </Card>
      )}
      <WorkoutSheet
        divisions={plan.workout_divisions}
        lastLoads={lastLoads}
        renderAction={(it) => (
          <TrainerLogButton
            studentId={plan.student_id}
            item={{ id: it.id, name: it.exercises?.name ?? "", sets: it.sets, reps: it.reps, load_kg: it.load_kg != null ? Number(it.load_kg) : null }}
          />
        )}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Progressão de carga</CardTitle>
            <CardDescription>A partir dos registros de execução</CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressPanel
              logs={(logs ?? []).map((l) => ({ exercise_id: l.exercise_id, exercise: l.exercises?.name ?? "", performed_on: l.performed_on, load_kg: l.load_kg != null ? Number(l.load_kg) : null }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Histórico de execução</CardTitle>
          </CardHeader>
          <CardContent className="max-h-80 space-y-2 overflow-y-auto text-sm">
            {!logs?.length && <p className="text-muted-foreground">Nenhum registro ainda.</p>}
            {(logs ?? []).slice(0, 50).map((l) => (
              <div key={l.id} className="flex justify-between gap-3 border-b pb-2 last:border-0">
                <span>
                  {l.exercises?.name}
                  {l.notes && <span className="block text-xs text-muted-foreground">{l.notes}</span>}
                </span>
                <span className="text-right whitespace-nowrap text-muted-foreground">
                  {formatDate(l.performed_on)}
                  <span className="block text-foreground">
                    {l.sets_done ?? "—"}×{l.reps_done ?? "—"} {l.load_kg != null && `· ${formatNumber(Number(l.load_kg))} kg`}
                  </span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
