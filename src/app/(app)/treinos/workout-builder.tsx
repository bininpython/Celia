"use client";
import { useRouter } from "next/navigation";
import { useFieldArray, type Control, type UseFormRegister } from "react-hook-form";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { MUSCLE_GROUPS, WORKOUT_LABELS } from "@/lib/labels";
import { workoutPlanSchema, type WorkoutPlanInput } from "@/lib/validators/training";
import { saveWorkoutPlan } from "./actions";

type Exercise = { id: string; name: string; muscle_group: string };
type Opt = { id: string; full_name: string };

const emptyItem = { exercise_id: "", sets: 3, reps: "10-12", load_kg: "", rest_seconds: 60, notes: "" };

function DivisionItems({
  control,
  register,
  index,
  exercises,
  errorOf,
}: {
  control: Control<WorkoutPlanInput>;
  register: UseFormRegister<WorkoutPlanInput>;
  index: number;
  exercises: Exercise[];
  errorOf: (n: string) => string | undefined;
}) {
  const { fields, append, remove, move } = useFieldArray({ control, name: `divisions.${index}.items` as const });
  const groups = Object.entries(MUSCLE_GROUPS)
    .map(([k, label]) => ({ label, items: exercises.filter((e) => e.muscle_group === k) }))
    .filter((g) => g.items.length);
  return (
    <div className="space-y-3">
      {fields.map((f, i) => {
        const base = `divisions.${index}.items.${i}` as const;
        return (
          <div key={f.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[minmax(0,2.4fr)_repeat(4,minmax(0,1fr))_auto]">
            <FormField label={`${i + 1}. Exercício`} htmlFor={`${base}.exercise_id`} error={errorOf(`${base}.exercise_id`)}>
              <NativeSelect id={`${base}.exercise_id`} {...register(`${base}.exercise_id`)}>
                <option value="">Selecione…</option>
                {groups.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.items.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Séries" htmlFor={`${base}.sets`} error={errorOf(`${base}.sets`)}>
              <Input id={`${base}.sets`} type="number" min={1} max={20} {...register(`${base}.sets`)} />
            </FormField>
            <FormField label="Repetições" htmlFor={`${base}.reps`} error={errorOf(`${base}.reps`)}>
              <Input id={`${base}.reps`} {...register(`${base}.reps`)} />
            </FormField>
            <FormField label="Carga (kg)" htmlFor={`${base}.load_kg`} error={errorOf(`${base}.load_kg`)}>
              <Input id={`${base}.load_kg`} type="number" step="0.5" min={0} {...register(`${base}.load_kg`)} />
            </FormField>
            <FormField label="Descanso (s)" htmlFor={`${base}.rest_seconds`} error={errorOf(`${base}.rest_seconds`)}>
              <Input id={`${base}.rest_seconds`} type="number" min={0} max={900} {...register(`${base}.rest_seconds`)} />
            </FormField>
            <div className="flex items-end gap-1">
              <Button type="button" size="icon-sm" variant="ghost" aria-label="Mover para cima" disabled={i === 0} onClick={() => move(i, i - 1)}>
                <ArrowUp />
              </Button>
              <Button type="button" size="icon-sm" variant="ghost" aria-label="Mover para baixo" disabled={i === fields.length - 1} onClick={() => move(i, i + 1)}>
                <ArrowDown />
              </Button>
              <Button type="button" size="icon-sm" variant="ghost" aria-label="Remover exercício" onClick={() => remove(i)}>
                <Trash2 />
              </Button>
            </div>
            <Input aria-label="Observações do exercício" placeholder="Observações (técnica, cadência…)" className="md:col-span-6" {...register(`${base}.notes`)} />
          </div>
        );
      })}
      {errorOf(`divisions.${index}.items`) && <p className="text-xs text-destructive">{errorOf(`divisions.${index}.items`)}</p>}
      <Button type="button" variant="outline" size="sm" onClick={() => append({ ...emptyItem })}>
        <Plus /> Adicionar exercício
      </Button>
    </div>
  );
}

export function WorkoutBuilder({
  id,
  initial,
  students,
  teachers,
  exercises,
}: {
  id?: string;
  initial: WorkoutPlanInput;
  students: Opt[];
  teachers: Opt[];
  exercises: Exercise[];
}) {
  const router = useRouter();
  const { form, submit, pending, errorOf } = useActionForm({
    schema: workoutPlanSchema,
    defaultValues: initial,
    action: (v) => saveWorkoutPlan({ ...v, id }),
    onSuccess: (d) => router.push(`/treinos/${d.id}`),
  });
  const divisions = useFieldArray({ control: form.control, name: "divisions" });
  const nextLabel = WORKOUT_LABELS[divisions.fields.length] ?? `T${divisions.fields.length + 1}`;
  const r = form.register;

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Dados da ficha</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Aluno" htmlFor="student_id" error={errorOf("student_id")} required>
            {id ? (
              <Input id="student_id" readOnly value={students.find((s) => s.id === initial.student_id)?.full_name ?? ""} />
            ) : (
              <NativeSelect id="student_id" {...r("student_id")}>
                <option value="">Selecione…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField label="Professor responsável" htmlFor="teacher_id" error={errorOf("teacher_id")}>
            <NativeSelect id="teacher_id" {...r("teacher_id")}>
              <option value="">—</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Título" htmlFor="title" error={errorOf("title")} required>
            <Input id="title" placeholder="Ex.: Hipertrofia — fase 1" {...r("title")} />
          </FormField>
          <FormField label="Objetivo" htmlFor="goal" error={errorOf("goal")}>
            <Input id="goal" {...r("goal")} />
          </FormField>
          <FormField label="Início" htmlFor="start_date" error={errorOf("start_date")} required>
            <Input id="start_date" type="date" {...r("start_date")} />
          </FormField>
          <FormField label="Próxima revisão / término" htmlFor="end_date" error={errorOf("end_date")}>
            <Input id="end_date" type="date" {...r("end_date")} />
          </FormField>
          <FormField label="Observações gerais" htmlFor="notes" error={errorOf("notes")} className="sm:col-span-2 lg:col-span-3">
            <Textarea id="notes" rows={2} {...r("notes")} />
          </FormField>
        </CardContent>
      </Card>

      {divisions.fields.map((d, i) => (
        <Card key={d.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm text-white">{form.watch(`divisions.${i}.label`) || "?"}</span>
              Treino {form.watch(`divisions.${i}.label`)}
            </CardTitle>
            <CardAction>
              <Button type="button" variant="ghost" size="sm" onClick={() => divisions.remove(i)} disabled={divisions.fields.length === 1}>
                <Trash2 /> Remover divisão
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
              <FormField label="Identificação" htmlFor={`divisions.${i}.label`} error={errorOf(`divisions.${i}.label`)}>
                <Input id={`divisions.${i}.label`} {...r(`divisions.${i}.label`)} />
              </FormField>
              <FormField label="Foco" htmlFor={`divisions.${i}.name`} error={errorOf(`divisions.${i}.name`)}>
                <Input id={`divisions.${i}.name`} placeholder="Ex.: Peito, ombro e tríceps" {...r(`divisions.${i}.name`)} />
              </FormField>
            </div>
            <DivisionItems control={form.control} register={form.register} index={i} exercises={exercises} errorOf={errorOf} />
          </CardContent>
        </Card>
      ))}
      {errorOf("divisions") && <p className="text-sm text-destructive">{errorOf("divisions")}</p>}

      <div className="flex flex-wrap justify-between gap-2">
        <Button type="button" variant="outline" onClick={() => divisions.append({ label: nextLabel, name: "", items: [{ ...emptyItem }] })}>
          <Plus /> Adicionar treino {nextLabel}
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />} Salvar ficha
          </Button>
        </div>
      </div>
    </form>
  );
}
