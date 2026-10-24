import { z } from "zod";
import {
  checkbox, intRange, isoDate, optionalCpf, optionalDate, optionalEmail, optionalPhone, optionalText, requiredText,
} from "./common";

export const studentSchema = z.object({
  full_name: requiredText("Nome", 120),
  cpf: optionalCpf(),
  email: optionalEmail(),
  phone: optionalPhone(),
  birth_date: optionalDate(),
  gender: z.preprocess((v) => (v === "" || v === undefined ? null : v), z.enum(["feminino", "masculino", "outro", "nao_informado"]).nullable()),
  address: optionalText(300),
  objective: optionalText(300),
  start_date: isoDate("Data de entrada"),
  due_day: intRange("Dia de vencimento", 1, 28),
  emergency_contact_name: optionalText(120),
  emergency_contact_phone: optionalPhone(),
  notes: optionalText(2000),
  lgpd_consent: checkbox().refine((v) => v, "É necessário registrar o consentimento do titular (LGPD)."),
  notifications_opt_in: checkbox(),
});
export type StudentInput = z.input<typeof studentSchema>;

export const healthSchema = z.object({
  student_id: z.uuid(),
  medical_conditions: optionalText(2000),
  medications: optionalText(2000),
  injuries: optionalText(2000),
  restrictions: optionalText(2000),
  physician_clearance: checkbox(),
  health_consent: checkbox().refine((v) => v, "Registre o consentimento específico para dados de saúde (LGPD art. 11)."),
});
export type HealthInput = z.input<typeof healthSchema>;

export const studentStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["ativo", "suspenso", "inativo", "arquivado"]),
});
