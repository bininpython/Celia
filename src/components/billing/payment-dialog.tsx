"use client";
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { FormField } from "@/components/shared/form-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { registerPayment } from "@/app/(app)/mensalidades/actions";
import { formatDate, todayISO } from "@/lib/dates";
import { invoiceTotal, lateCharges } from "@/lib/finance/invoice";
import { formatCurrency } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { round2 } from "@/lib/utils";
import { paymentSchema } from "@/lib/validators/billing";

export type PayableInvoice = {
  id: string;
  description: string;
  due_date: string;
  amount: number;
  discount: number;
  fine: number;
  interest: number;
  paid: number;
  studentName: string;
};

export function PaymentDialog({
  invoice,
  finePercent,
  interestPercent,
  trigger,
}: {
  invoice: PayableInvoice;
  finePercent: number;
  interestPercent: number;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const today = todayISO();
  const suggested = useMemo(
    () =>
      lateCharges({
        amount: invoice.amount,
        discount: invoice.discount,
        dueDate: invoice.due_date,
        payDate: today,
        finePercent,
        monthlyInterestPercent: interestPercent,
      }),
    [invoice, finePercent, interestPercent, today],
  );
  const fine = invoice.fine || suggested.fine;
  const interest = invoice.interest || suggested.interest;
  const due = round2(invoiceTotal({ ...invoice, fine, interest }) - invoice.paid);

  const { form, submit, pending, errorOf } = useActionForm({
    schema: paymentSchema,
    defaultValues: {
      invoice_id: invoice.id,
      method: "pix",
      paid_on: today,
      amount: due,
      fine,
      interest,
      discount: invoice.discount,
      notes: "",
    },
    action: registerPayment,
    // O recibo vai em um toast global: a linha da mensalidade é re-renderizada como paga
    silentSuccess: true,
    onSuccess: (data) => {
      setOpen(false);
      toast.success(`Pagamento registrado — recibo nº ${data.receipt}.`, {
        duration: 15000,
        action: { label: "Imprimir recibo", onClick: () => window.open(`/mensalidades/recibo/${data.paymentId}`, "_blank") },
      });
    },
  });
  const w = form.watch(["fine", "interest", "discount"]);
  const total = round2(invoice.amount - Number(w[2] || 0) + Number(w[0] || 0) + Number(w[1] || 0) - invoice.paid);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
          <DialogDescription>
            {invoice.studentName} · {invoice.description} · vencimento {formatDate(invoice.due_date)}
          </DialogDescription>
        </DialogHeader>
          <form onSubmit={submit} className="space-y-4" noValidate>
            {suggested.days > 0 && (
              <p className="rounded-md bg-accent px-3 py-2 text-xs text-accent-foreground">
                {suggested.days} dia(s) de atraso: multa de {finePercent}% e juros de {interestPercent}% a.m. sugeridos. Ajuste se
                necessário.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Multa" htmlFor="fine" error={errorOf("fine")}>
                <Input id="fine" type="number" step="0.01" min={0} {...form.register("fine")} />
              </FormField>
              <FormField label="Juros" htmlFor="interest" error={errorOf("interest")}>
                <Input id="interest" type="number" step="0.01" min={0} {...form.register("interest")} />
              </FormField>
              <FormField label="Desconto" htmlFor="discount" error={errorOf("discount")}>
                <Input id="discount" type="number" step="0.01" min={0} {...form.register("discount")} />
              </FormField>
            </div>
            <p className="text-sm text-muted-foreground">
              Saldo devedor: <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
              {invoice.paid > 0 && ` (já pago ${formatCurrency(invoice.paid)})`}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Valor recebido" htmlFor="amount" error={errorOf("amount")} required>
                <Input id="amount" type="number" step="0.01" min={0.01} {...form.register("amount")} />
              </FormField>
              <FormField label="Forma" htmlFor="method" error={errorOf("method")} required>
                <NativeSelect id="method" {...form.register("method")}>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField label="Data" htmlFor="paid_on" error={errorOf("paid_on")} required>
                <Input id="paid_on" type="date" max={today} {...form.register("paid_on")} />
              </FormField>
            </div>
            <FormField label="Observações" htmlFor="pay_notes" error={errorOf("notes")}>
              <Input id="pay_notes" {...form.register("notes")} />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />} Confirmar pagamento
              </Button>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
}
