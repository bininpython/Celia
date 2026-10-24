"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { ROLE_LABELS } from "@/lib/labels";
import { inviteSchema, staffSchema, type StaffInput } from "@/lib/validators/admin";
import type { Role } from "@/lib/permissions";
import { createStaffAccess, saveStaff, updateProfileAccess } from "./actions";

export function StaffDialog({ staff, canCreateAdmin }: { staff?: StaffInput & { id: string }; canCreateAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const { form, submit, pending, errorOf } = useActionForm({
    schema: staffSchema,
    defaultValues: staff ?? {
      full_name: "",
      email: "",
      phone: "",
      cpf: "",
      role: "professor",
      position: "",
      hire_date: "",
      salary: "",
      responsibilities: "",
      schedule_text: "",
      active: true,
      notes: "",
    },
    action: (v) => saveStaff({ ...v, id: staff?.id }),
    onSuccess: () => {
      setOpen(false);
      if (!staff) form.reset();
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {staff ? (
          <Button size="icon-sm" variant="ghost" aria-label={`Editar ${staff.full_name}`}>
            <Pencil />
          </Button>
        ) : (
          <Button>
            <Plus /> Novo funcionário
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{staff ? "Editar funcionário" : "Novo funcionário"}</DialogTitle>
          <DialogDescription>O perfil define o que a pessoa pode acessar no sistema.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Nome" htmlFor="st_name" error={errorOf("full_name")} required className="sm:col-span-2">
              <Input id="st_name" {...form.register("full_name")} />
            </FormField>
            <FormField label="Perfil de acesso" htmlFor="st_role" error={errorOf("role")} required>
              <NativeSelect id="st_role" {...form.register("role")}>
                {(["gerente", "recepcionista", "professor", ...(canCreateAdmin ? ["admin"] : [])] as const).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r as Role]}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Cargo / função" htmlFor="st_pos" error={errorOf("position")}>
              <Input id="st_pos" placeholder="Ex.: Personal trainer" {...form.register("position")} />
            </FormField>
            <FormField label="E-mail" htmlFor="st_email" error={errorOf("email")}>
              <Input id="st_email" type="email" {...form.register("email")} />
            </FormField>
            <FormField label="Telefone" htmlFor="st_phone" error={errorOf("phone")}>
              <Input id="st_phone" {...form.register("phone")} />
            </FormField>
            <FormField label="CPF" htmlFor="st_cpf" error={errorOf("cpf")}>
              <Input id="st_cpf" {...form.register("cpf")} />
            </FormField>
            <FormField label="Admissão" htmlFor="st_hire" error={errorOf("hire_date")}>
              <Input id="st_hire" type="date" {...form.register("hire_date")} />
            </FormField>
            <FormField label="Salário" htmlFor="st_salary" error={errorOf("salary")}>
              <Input id="st_salary" type="number" step="0.01" min={0} {...form.register("salary")} />
            </FormField>
          </div>
          <FormField label="Agenda / horários de trabalho" htmlFor="st_sched" error={errorOf("schedule_text")} hint="Ex.: Seg a Sex 06h–12h">
            <Input id="st_sched" {...form.register("schedule_text")} />
          </FormField>
          <FormField label="Responsabilidades" htmlFor="st_resp" error={errorOf("responsibilities")}>
            <Textarea id="st_resp" rows={2} {...form.register("responsibilities")} />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-[var(--primary)]" {...form.register("active")} /> Ativo
          </label>
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

export function StaffAccessDialog({ staffId, email }: { staffId: string; email: string | null }) {
  const [open, setOpen] = useState(false);
  const { form, submit, pending, errorOf } = useActionForm({
    schema: inviteSchema,
    defaultValues: { email: email ?? "", password: "", staff_id: staffId, student_id: "" },
    action: (v) => createStaffAccess({ ...v, staff_id: staffId }),
    onSuccess: () => setOpen(false),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <KeyRound /> Criar acesso
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar acesso ao sistema</DialogTitle>
          <DialogDescription>Login com o perfil definido no cadastro do funcionário.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <FormField label="E-mail" htmlFor="sa_email" error={errorOf("email")} required>
            <Input id="sa_email" type="email" {...form.register("email")} />
          </FormField>
          <FormField label="Senha provisória" htmlFor="sa_pass" error={errorOf("password")} required hint="Mínimo de 8 caracteres">
            <Input id="sa_pass" autoComplete="off" {...form.register("password")} />
          </FormField>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Criar acesso
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProfileAccessControls({ id, role, active, isSelf }: { id: string; role: Role; active: boolean; isSelf: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const update = (next: { role: Role; active: boolean }) =>
    start(async () => {
      const r = await updateProfileAccess({ id, ...next });
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message);
      router.refresh();
    });
  return (
    <div className="flex items-center justify-end gap-2">
      <NativeSelect aria-label="Perfil" value={role} disabled={pending || isSelf} onChange={(e) => update({ role: e.target.value as Role, active })} className="w-40">
        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </NativeSelect>
      <Switch checked={active} disabled={pending || isSelf} aria-label={active ? "Desativar acesso" : "Ativar acesso"} onCheckedChange={(v) => update({ role, active: v })} />
    </div>
  );
}
