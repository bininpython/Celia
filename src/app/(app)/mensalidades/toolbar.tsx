"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { FormField } from "@/components/shared/form-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { invoiceSchema } from "@/lib/validators/billing";
import { createInvoice, generateInvoices } from "./actions";

export function GenerateInvoicesButton({ defaultMonth }: { defaultMonth: string }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(defaultMonth.slice(0, 7));
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CalendarPlus /> Gerar mensalidades
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar mensalidades da competência</DialogTitle>
          <DialogDescription>
            Cria as cobranças de todas as matrículas ativas cujo ciclo vence no mês (mensal todo mês, trimestral a cada 3 meses
            etc.). Cobranças já existentes não são duplicadas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="month">Competência</Label>
          <Input id="month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            disabled={pending || !month}
            onClick={() =>
              start(async () => {
                const r = await generateInvoices({ month: `${month}-01` });
                if (!r.ok) return void toast.error(r.error);
                toast.success(r.message);
                setOpen(false);
                router.refresh();
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />} Gerar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NewInvoiceButton({ students, studentId }: { students: { id: string; full_name: string }[]; studentId?: string }) {
  const [open, setOpen] = useState(false);
  const { form, submit, pending, errorOf } = useActionForm({
    schema: invoiceSchema,
    defaultValues: { student_id: studentId ?? "", description: "", due_date: new Date().toISOString().slice(0, 10), amount: "", discount: 0, notes: "" },
    action: createInvoice,
    onSuccess: () => {
      setOpen(false);
      form.reset();
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={studentId ? "outline" : "default"} size={studentId ? "sm" : "default"}>
          <Plus /> Cobrança avulsa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova cobrança avulsa</DialogTitle>
          <DialogDescription>Para avaliações, serviços extras ou ajustes fora do plano.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          {!studentId && (
            <FormField label="Aluno" htmlFor="inv_student" error={errorOf("student_id")} required>
              <NativeSelect id="inv_student" {...form.register("student_id")}>
                <option value="">Selecione…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          )}
          <FormField label="Descrição" htmlFor="inv_desc" error={errorOf("description")} required>
            <Input id="inv_desc" {...form.register("description")} placeholder="Ex.: Avaliação física" />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Valor" htmlFor="inv_amount" error={errorOf("amount")} required>
              <Input id="inv_amount" type="number" step="0.01" min={0.01} {...form.register("amount")} />
            </FormField>
            <FormField label="Desconto" htmlFor="inv_disc" error={errorOf("discount")}>
              <Input id="inv_disc" type="number" step="0.01" min={0} {...form.register("discount")} />
            </FormField>
            <FormField label="Vencimento" htmlFor="inv_due" error={errorOf("due_date")} required>
              <Input id="inv_due" type="date" {...form.register("due_date")} />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Criar cobrança
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
