import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LogoBadge } from "@/components/brand/logo";
import { PrintButton } from "@/components/shared/print-button";
import { WorkoutSheet } from "@/components/training/workout-sheet";
import { requireModule } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { getWorkoutPlan } from "@/lib/queries/training";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Imprimir ficha" };

export default async function PrintWorkoutPage({ params }: PageProps<"/treinos/[id]/imprimir">) {
  await requireModule("treinos");
  const { id } = await params;
  const supabase = await createClient();
  const plan = await getWorkoutPlan(supabase, id);
  if (!plan) notFound();
  const { data: gym } = await supabase.from("gyms").select("name").single();
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="no-print flex justify-end">
        <PrintButton label="Imprimir ficha" />
      </div>
      <article className="space-y-6 rounded-xl border bg-card p-6 print:border-0 print:p-0">
        <header className="flex items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-3">
            <LogoBadge className="size-10" />
            <div>
              <p className="font-semibold">{gym?.name}</p>
              <p className="text-sm text-muted-foreground">Ficha de treino</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium">{plan.students?.full_name}</p>
            <p className="text-muted-foreground">
              {plan.title} · {formatDate(plan.start_date)}
              {plan.end_date && ` a ${formatDate(plan.end_date)}`}
            </p>
          </div>
        </header>
        {plan.goal && <p className="text-sm">Objetivo: {plan.goal}</p>}
        <WorkoutSheet divisions={plan.workout_divisions} compact />
        {plan.notes && <p className="text-sm text-muted-foreground">{plan.notes}</p>}
      </article>
    </div>
  );
}
