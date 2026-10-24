"use client";
import { useState } from "react";
import { Loader2, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { todayISO } from "@/lib/dates";
import { workoutLogSchema, type WorkoutLogInput } from "@/lib/validators/training";

type Result = { ok: true; data: undefined; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function LogDialog({
  item,
  action,
}: {
  item: { id: string; name: string; sets: number; reps: string; load_kg: number | null };
  action: (v: WorkoutLogInput) => Promise<Result>;
}) {
  const [open, setOpen] = useState(false);
  const { form, submit, pending, errorOf } = useActionForm({
    schema: workoutLogSchema,
    defaultValues: {
      workout_exercise_id: item.id,
      performed_on: todayISO(),
      sets_done: item.sets,
      reps_done: item.reps,
      load_kg: item.load_kg ?? "",
      notes: "",
    },
    action,
    onSuccess: () => setOpen(false),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" aria-label={`Registrar execução de ${item.name}`}>
          <NotebookPen /> <span className="hidden sm:inline">Registrar</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar execução</DialogTitle>
          <DialogDescription>{item.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Data" htmlFor="lg_date" error={errorOf("performed_on")}>
              <Input id="lg_date" type="date" max={todayISO()} {...form.register("performed_on")} />
            </FormField>
            <FormField label="Carga utilizada (kg)" htmlFor="lg_load" error={errorOf("load_kg")}>
              <Input id="lg_load" type="number" step="0.5" min={0} {...form.register("load_kg")} />
            </FormField>
            <FormField label="Séries feitas" htmlFor="lg_sets" error={errorOf("sets_done")}>
              <Input id="lg_sets" type="number" min={0} {...form.register("sets_done")} />
            </FormField>
            <FormField label="Repetições" htmlFor="lg_reps" error={errorOf("reps_done")}>
              <Input id="lg_reps" {...form.register("reps_done")} />
            </FormField>
          </div>
          <FormField label="Observações" htmlFor="lg_notes" error={errorOf("notes")}>
            <Input id="lg_notes" placeholder="Como se sentiu, ajustes…" {...form.register("notes")} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
