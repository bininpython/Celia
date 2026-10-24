import { z } from "zod";
import { checkbox, intRange, isoDate, money, optionalDate, optionalEmail, optionalText, optionalUuid, requiredText } from "./common";

export const staffSchema = z.object({
  full_name: requiredText("Nome", 120),
  email: optionalEmail(),
  phone: optionalText(20),
  cpf: optionalText(14),
  role: z.enum(["admin", "gerente", "recepcionista", "professor"]),
  position: optionalText(80),
  hire_date: optionalDate(),
  salary: z.preprocess((v) => (v === "" || v == null ? null : Number(String(v).replace(",", "."))), z.number().min(0).nullable()),
  responsibilities: optionalText(1000),
  schedule_text: optionalText(500),
  active: checkbox(),
  notes: optionalText(1000),
});
export type StaffInput = z.input<typeof staffSchema>;

export const inviteSchema = z.object({
  email: z.email("E-mail inválido"),
  password: z.string().min(8, "Mínimo de 8 caracteres").max(72),
  staff_id: optionalUuid(),
  student_id: optionalUuid(),
});

export const eventSchema = z
  .object({
    title: requiredText("Título", 120),
    kind: z.enum(["aula", "avaliacao", "compromisso"]),
    starts_at: z.string().min(16, "Início inválido"),
    ends_at: z.string().min(16, "Término inválido"),
    staff_id: optionalUuid(),
    student_id: optionalUuid(),
    location: optionalText(120),
    capacity: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().positive().max(500).nullable()),
    description: optionalText(1000),
  })
  .refine((e) => e.ends_at > e.starts_at, { message: "Término deve ser após o início", path: ["ends_at"] });
export type EventInput = z.input<typeof eventSchema>;

export const gymSettingsSchema = z.object({
  name: requiredText("Nome", 120),
  legal_name: optionalText(160),
  cnpj: optionalText(18),
  email: optionalEmail(),
  phone: optionalText(20),
  whatsapp: optionalText(20),
  address: optionalText(300),
  city: optionalText(80),
  state: optionalText(2),
  zip_code: optionalText(9),
  default_due_day: intRange("Vencimento padrão", 1, 28),
  late_fee_percent: money("Multa"),
  monthly_interest_percent: money("Juros"),
  due_alert_days: intRange("Aviso de vencimento", 0, 30),
  absence_alert_days: intRange("Alerta de ausência", 1, 90),
  opening_balance: z.preprocess((v) => Number(String(v).replace(",", ".")), z.number()),
  opening_balance_date: isoDate("Data do saldo inicial"),
  data_retention_months: intRange("Retenção", 12, 240),
  opening_hours_text: optionalText(500),
});
export type GymSettingsInput = z.input<typeof gymSettingsSchema>;

export const profileRoleSchema = z.object({
  id: z.uuid(),
  role: z.enum(["admin", "gerente", "recepcionista", "professor", "aluno"]),
  active: z.boolean(),
});

export const contactSchema = z.object({
  phone: optionalText(20),
  email: optionalEmail(),
  address: optionalText(300),
  emergency_contact_name: optionalText(120),
  emergency_contact_phone: optionalText(20),
  notifications_opt_in: checkbox(),
});
export type ContactInput = z.input<typeof contactSchema>;

export const periodSchema = z.object({ from: isoDate(), to: isoDate() });
