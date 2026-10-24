"use client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { GENDER_LABELS } from "@/lib/labels";
import { studentSchema, type StudentInput } from "@/lib/validators/students";
import { createStudent, updateStudent } from "./actions";

export function StudentForm({ initial, id, defaultDueDay }: { initial?: Partial<StudentInput>; id?: string; defaultDueDay: number }) {
  const router = useRouter();
  const { form, submit, pending, errorOf } = useActionForm({
    schema: studentSchema,
    defaultValues: {
      full_name: "",
      cpf: "",
      email: "",
      phone: "",
      birth_date: "",
      gender: "",
      address: "",
      objective: "",
      start_date: new Date().toISOString().slice(0, 10),
      due_day: defaultDueDay,
      emergency_contact_name: "",
      emergency_contact_phone: "",
      notes: "",
      lgpd_consent: !!id,
      notifications_opt_in: false,
      ...initial,
    },
    action: (values) => (id ? updateStudent({ ...values, id }) : createStudent(values)),
    onSuccess: (data) => router.push(`/alunos/${data.id}`),
  });
  const r = form.register;
  const err = (n: keyof StudentInput) => errorOf(n);
  const aria = (n: keyof StudentInput) => ({ "aria-invalid": !!err(n), "aria-describedby": err(n) ? `${n}-error` : undefined });

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Dados pessoais</CardTitle>
          <CardDescription>Colete apenas os dados necessários ao atendimento (LGPD).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Nome completo" htmlFor="full_name" error={err("full_name")} required className="sm:col-span-2">
            <Input id="full_name" autoComplete="name" {...r("full_name")} {...aria("full_name")} />
          </FormField>
          <FormField label="CPF" htmlFor="cpf" error={err("cpf")}>
            <Input id="cpf" inputMode="numeric" placeholder="000.000.000-00" {...r("cpf")} {...aria("cpf")} />
          </FormField>
          <FormField label="Data de nascimento" htmlFor="birth_date" error={err("birth_date")}>
            <Input id="birth_date" type="date" {...r("birth_date")} {...aria("birth_date")} />
          </FormField>
          <FormField label="Gênero" htmlFor="gender" error={err("gender")}>
            <NativeSelect id="gender" {...r("gender")}>
              <option value="">Não informado</option>
              {Object.entries(GENDER_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Objetivo" htmlFor="objective" error={err("objective")}>
            <Input id="objective" placeholder="Ex.: hipertrofia, emagrecimento" {...r("objective")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contato</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Telefone / WhatsApp" htmlFor="phone" error={err("phone")}>
            <Input id="phone" type="tel" inputMode="tel" placeholder="(00) 00000-0000" {...r("phone")} {...aria("phone")} />
          </FormField>
          <FormField label="E-mail" htmlFor="email" error={err("email")}>
            <Input id="email" type="email" autoComplete="email" {...r("email")} {...aria("email")} />
          </FormField>
          <FormField label="Endereço" htmlFor="address" error={err("address")}>
            <Input id="address" autoComplete="street-address" {...r("address")} />
          </FormField>
          <FormField label="Contato de emergência" htmlFor="emergency_contact_name" error={err("emergency_contact_name")}>
            <Input id="emergency_contact_name" {...r("emergency_contact_name")} />
          </FormField>
          <FormField label="Telefone de emergência" htmlFor="emergency_contact_phone" error={err("emergency_contact_phone")}>
            <Input id="emergency_contact_phone" type="tel" {...r("emergency_contact_phone")} {...aria("emergency_contact_phone")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Matrícula</CardTitle>
          <CardDescription>O plano é definido no perfil do aluno após o cadastro.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Data de entrada" htmlFor="start_date" error={err("start_date")} required>
            <Input id="start_date" type="date" {...r("start_date")} {...aria("start_date")} />
          </FormField>
          <FormField label="Dia de vencimento" htmlFor="due_day" error={err("due_day")} required hint="Entre 1 e 28">
            <Input id="due_day" type="number" min={1} max={28} {...r("due_day")} {...aria("due_day")} />
          </FormField>
          <FormField label="Observações" htmlFor="notes" error={err("notes")} className="sm:col-span-2 lg:col-span-3">
            <Textarea id="notes" rows={3} {...r("notes")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consentimentos (LGPD)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {id ? (
            <p className="text-muted-foreground">Consentimento para tratamento de dados já registrado no cadastro.</p>
          ) : (
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" {...r("lgpd_consent")} />
              <span>
                O titular foi informado e consente com o tratamento dos dados pessoais para prestação dos serviços, cobrança e
                controle de acesso.
              </span>
            </label>
          )}
          {err("lgpd_consent") && <p className="text-xs text-destructive">{err("lgpd_consent")}</p>}
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" {...r("notifications_opt_in")} />
            <span>O aluno autoriza receber avisos de vencimento e comunicados no portal.</span>
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {id ? "Salvar alterações" : "Cadastrar aluno"}
        </Button>
      </div>
    </form>
  );
}
