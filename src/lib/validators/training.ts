import { z } from "zod";
import { isoDate, optionalDate, optionalNumber, optionalText, requiredText } from "./common";

export const exerciseSchema = z.object({
  name: requiredText("Nome", 120),
  muscle_group: requiredText("Grupo muscular", 40),
  equipment: requiredText("Equipamento", 40),
  instructions: optionalText(2000),
  video_url: z.preprocess((v) => (v === "" || v === undefined ? null : v), z.url("URL inválida").nullable()),
});
export type ExerciseInput = z.input<typeof exerciseSchema>;

export const workoutItemSchema = z.object({
  exercise_id: z.uuid({ error: "Selecione o exercício" }),
  sets: z.preprocess((v) => Number(v), z.number().int().min(1, "Mín. 1").max(20)),
  reps: requiredText("Repetições", 20),
  load_kg: optionalNumber(0, 1000),
  rest_seconds: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(0).max(900).nullable()),
  notes: optionalText(300),
});

export const workoutDivisionSchema = z.object({
  label: requiredText("Identificação", 20),
  name: optionalText(80),
  items: z.array(workoutItemSchema).min(1, "Adicione ao menos um exercício"),
});

export const workoutPlanSchema = z
  .object({
    student_id: z.uuid({ error: "Selecione o aluno" }),
    teacher_id: z.preprocess((v) => (v === "" || v === undefined ? null : v), z.uuid().nullable()),
    title: requiredText("Título", 120),
    goal: optionalText(200),
    start_date: isoDate("Início"),
    end_date: optionalDate(),
    notes: optionalText(1000),
    divisions: z.array(workoutDivisionSchema).min(1, "Adicione ao menos uma divisão"),
  })
  .refine((p) => !p.end_date || p.end_date >= p.start_date, { message: "Término antes do início", path: ["end_date"] });
export type WorkoutPlanInput = z.input<typeof workoutPlanSchema>;

export const workoutLogSchema = z.object({
  workout_exercise_id: z.uuid(),
  performed_on: isoDate("Data"),
  sets_done: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(0).max(50).nullable()),
  reps_done: optionalText(20),
  load_kg: optionalNumber(0, 1000),
  notes: optionalText(300),
});
export type WorkoutLogInput = z.input<typeof workoutLogSchema>;
