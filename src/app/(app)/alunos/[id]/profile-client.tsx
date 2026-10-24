"use client";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Camera, KeyRound, Loader2, MoreHorizontal, Pause, Pencil, Play, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { FormField } from "@/components/shared/form-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { addMonths, todayISO } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import { PERIODICITY_LABELS } from "@/lib/labels";
import { round2 } from "@/lib/utils";
import { membershipSchema } from "@/lib/validators/billing";
import { inviteSchema } from "@/lib/validators/admin";
import { healthSchema, type HealthInput } from "@/lib/validators/students";
import { renegotiate } from "@/app/(app)/mensalidades/actions";
import {
  anonymizeStudent, cancelMembership, createMembership, createStudentAccess, deleteStudent, saveHealth, setStudentStatus,
  uploadStudentPhoto,
} from "../actions";
import type { Enums } from "@/types/database";

export function StudentMenu({
  id,
  status,
  canEdit,
  canDelete,
  anonymized,
}: {
  id: string;
  status: Enums<"student_status">;
  canEdit: boolean;
  canDelete: boolean;
  anonymized: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (s: Enums<"student_status">) =>
    start(async () => {
      const r = await setStudentStatus({ id, status: s });
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message);
      router.refresh();
    });
  if (!canEdit || anonymized) return null;
  return (
    <div className="flex gap-2">
      <Button variant="outline" asChild>
        <Link href={`/alunos/${id}/editar`}>
          <Pencil /> Editar
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Mais ações" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {status !== "ativo" && (
            <DropdownMenuItem onSelect={() => set("ativo")}>
              <Play /> Reativar
            </DropdownMenuItem>
          )}
          {status === "ativo" && (
            <DropdownMenuItem onSelect={() => set("suspenso")}>
              <Pause /> Suspender
            </DropdownMenuItem>
          )}
          {status !== "inativo" && status !== "arquivado" && (
            <DropdownMenuItem onSelect={() => set("inativo")}>
              <UserX /> Inativar
            </DropdownMenuItem>
          )}
          {status !== "arquivado" && (
            <DropdownMenuItem onSelect={() => set("arquivado")}>
              <Archive /> Arquivar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {canDelete && (
        <>
          <ConfirmAction
            trigger={
              <Button variant="outline" size="icon" aria-label="Excluir aluno">
                <Trash2 />
              </Button>
            }
            title="Excluir aluno?"
            description="A exclusão definitiva só é permitida para alunos sem histórico financeiro. Para os demais, use a anonimização."
            destructive
            confirmLabel="Excluir"
            onConfirm={() => deleteStudent({ id })}
            redirectTo="/alunos"
          />
          <ConfirmAction
            trigger={<Button variant="ghost">Anonimizar</Button>}
            title="Anonimizar dados pessoais?"
            description={
              <span>
                Remove nome, documentos, contatos, foto, dados de saúde e registros de treino, mantendo apenas os registros
                financeiros exigidos por lei (LGPD art. 16). <strong>Esta ação é irreversível.</strong>
              </span>
            }
            destructive
            confirmLabel="Anonimizar"
            onConfirm={() => anonymizeStudent({ id })}
          />
        </>
      )}
    </div>
  );
}

export function PhotoUpload({ studentId }: { studentId: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Enviar foto"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const fd = new FormData();
          fd.set("student_id", studentId);
          fd.set("photo", file);
          start(async () => {
            const r = await uploadStudentPhoto(fd);
            if (!r.ok) return void toast.error(r.error);
            toast.success(r.message);
            router.refresh();
          });
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        size="icon-sm"
        variant="secondary"
        className="absolute -right-1 -bottom-1 rounded-full border"
        onClick={() => ref.current?.click()}
        aria-label="Alterar foto"
        disabled={pending}
      >
        {pending ? <Loader2 className="animate-spin" /> : <Camera />}
      </Button>
    </>
  );
}

type PlanOption = { id: string; name: string; price: number; duration_months: number; periodicity: Enums<"plan_periodicity"> };

export function NewMembershipDialog({ studentId, plans }: { studentId: string; plans: PlanOption[] }) {
  const [open, setOpen] = useState(false);
  const { form, submit, pending, errorOf } = useActionForm({
    schema: membershipSchema,
    defaultValues: {
      student_id: studentId,
      plan_id: "",
      start_date: todayISO(),
      end_date: "",
      price: 0,
      discount: 0,
      auto_renew: true,
      generate_first_invoice: true,
    },
    action: createMembership,
    onSuccess: () => setOpen(false),
  });
  const planId = form.watch("plan_id");
  const plan = plans.find((p) => p.id === planId);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Nova matrícula</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova matrícula</DialogTitle>
          <DialogDescription>Vincula o aluno a um plano. As próximas mensalidades são geradas por competência.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <FormField label="Plano" htmlFor="plan_id" error={errorOf("plan_id")} required>
            <NativeSelect
              id="plan_id"
              {...form.register("plan_id", {
                onChange: (e) => {
                  const p = plans.find((x) => x.id === e.target.value);
                  if (p) {
                    form.setValue("price", p.price);
                    if (!form.getValues("auto_renew")) form.setValue("end_date", addMonths(form.getValues("start_date") as string, p.duration_months));
                  }
                },
              })}
            >
              <option value="">Selecione…</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {PERIODICITY_LABELS[p.periodicity]} · {formatCurrency(p.price)}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Início" htmlFor="m_start" error={errorOf("start_date")} required>
              <Input id="m_start" type="date" {...form.register("start_date")} />
            </FormField>
            <FormField label="Término (opcional)" htmlFor="m_end" error={errorOf("end_date")} hint="Vazio = renovação automática">
              <Input id="m_end" type="date" {...form.register("end_date")} />
            </FormField>
            <FormField label="Valor por ciclo" htmlFor="m_price" error={errorOf("price")} required>
              <Input id="m_price" type="number" step="0.01" min={0} {...form.register("price")} />
            </FormField>
            <FormField label="Desconto por ciclo" htmlFor="m_disc" error={errorOf("discount")}>
              <Input id="m_disc" type="number" step="0.01" min={0} {...form.register("discount")} />
            </FormField>
          </div>
          {plan && (
            <p className="text-xs text-muted-foreground">
              Equivale a {formatCurrency(round2((Number(form.watch("price") || 0) - Number(form.watch("discount") || 0)) / plan.duration_months))}/mês.
            </p>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-[var(--primary)]" {...form.register("generate_first_invoice")} />
            Gerar a primeira cobrança com vencimento na data de início
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Matricular
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CancelMembershipDialog({ membershipId }: { membershipId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelOpen, setCancelOpen] = useState(true);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-destructive">
          Cancelar matrícula
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar matrícula</DialogTitle>
          <DialogDescription>O cancelamento entra nos indicadores de retenção.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label htmlFor="cancel_reason">Motivo</Label>
            <Textarea id="cancel_reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={cancelOpen} onCheckedChange={(v) => setCancelOpen(v === true)} />
            Cancelar mensalidades futuras em aberto
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            disabled={pending || reason.trim().length < 3}
            onClick={() =>
              start(async () => {
                const r = await cancelMembership({ id: membershipId, reason, cancel_open_invoices: cancelOpen });
                if (!r.ok) return void toast.error(r.error);
                toast.success(r.message);
                setOpen(false);
                router.refresh();
              })
            }
          >
            Confirmar cancelamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HealthForm({ studentId, initial, hasConsent }: { studentId: string; initial: Partial<HealthInput>; hasConsent: boolean }) {
  const { form, submit, pending, errorOf } = useActionForm({
    schema: healthSchema,
    defaultValues: {
      student_id: studentId,
      medical_conditions: "",
      medications: "",
      injuries: "",
      restrictions: "",
      physician_clearance: false,
      health_consent: hasConsent,
      ...initial,
    },
    action: saveHealth,
  });
  const fields = [
    ["medical_conditions", "Condições médicas"],
    ["medications", "Medicamentos em uso"],
    ["injuries", "Lesões / cirurgias"],
    ["restrictions", "Restrições para exercícios"],
  ] as const;
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map(([name, label]) => (
          <FormField key={name} label={label} htmlFor={name} error={errorOf(name)}>
            <Textarea id={name} rows={3} {...form.register(name)} />
          </FormField>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4 accent-[var(--primary)]" {...form.register("physician_clearance")} />
        Possui liberação médica para atividade física
      </label>
      {!hasConsent && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" {...form.register("health_consent")} />
          O aluno consentiu, de forma específica e destacada, com o tratamento destes dados de saúde para segurança da prescrição
          de treinos (LGPD art. 11).
        </label>
      )}
      {errorOf("health_consent") && <p className="text-xs text-destructive">{errorOf("health_consent")}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} Salvar
        </Button>
      </div>
    </form>
  );
}

export function AccessDialog({ studentId, email }: { studentId: string; email: string | null }) {
  const [open, setOpen] = useState(false);
  const { form, submit, pending, errorOf } = useActionForm({
    schema: inviteSchema,
    defaultValues: { email: email ?? "", password: "", student_id: studentId, staff_id: "" },
    action: (v) => createStudentAccess({ ...v, student_id: studentId }),
    onSuccess: () => setOpen(false),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <KeyRound /> Criar acesso ao portal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Acesso ao portal do aluno</DialogTitle>
          <DialogDescription>O aluno verá apenas os próprios treinos, mensalidades e frequência. Oriente-o a trocar a senha no primeiro acesso.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <FormField label="E-mail de login" htmlFor="acc_email" error={errorOf("email")} required>
            <Input id="acc_email" type="email" {...form.register("email")} />
          </FormField>
          <FormField label="Senha provisória" htmlFor="acc_pass" error={errorOf("password")} required hint="Mínimo de 8 caracteres">
            <Input id="acc_pass" type="text" autoComplete="off" {...form.register("password")} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Criar acesso
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RenegotiateDialog({ invoices }: { invoices: { id: string; label: string; total: number }[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [installments, setInstallments] = useState(1);
  const [firstDue, setFirstDue] = useState(todayISO());
  const [total, setTotal] = useState<number | "">("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const sum = round2(invoices.filter((i) => selected.includes(i.id)).reduce((a, i) => a + i.total, 0));
  if (!invoices.length) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Renegociar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renegociar mensalidades</DialogTitle>
          <DialogDescription>As cobranças selecionadas serão substituídas por novas parcelas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <ul className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
            {invoices.map((i) => (
              <li key={i.id}>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selected.includes(i.id)}
                    onCheckedChange={(v) => setSelected((s) => (v === true ? [...s, i.id] : s.filter((x) => x !== i.id)))}
                  />
                  <span className="flex-1">{i.label}</span>
                  <span className="tabular-nums">{formatCurrency(i.total)}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">Total selecionado: {formatCurrency(sum)}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="rn_total">Novo total</Label>
              <Input id="rn_total" type="number" step="0.01" placeholder={String(sum)} value={total} onChange={(e) => setTotal(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rn_inst">Parcelas</Label>
              <Input id="rn_inst" type="number" min={1} max={24} value={installments} onChange={(e) => setInstallments(Number(e.target.value))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rn_due">1º vencimento</Label>
              <Input id="rn_due" type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            disabled={pending || !selected.length}
            onClick={() =>
              start(async () => {
                const r = await renegotiate({ invoice_ids: selected, installments, first_due: firstDue, total: total === "" ? sum : total, notes: null });
                if (!r.ok) return void toast.error(r.error);
                toast.success(r.message);
                setOpen(false);
                setSelected([]);
                router.refresh();
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />} Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
