"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCheck, Loader2, MoreHorizontal, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { todayISO } from "@/lib/dates";
import { NATURE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { transactionSchema, type TransactionInput } from "@/lib/validators/finance";
import { cancelTransaction, saveTransaction, settleTransaction } from "./actions";

type Category = { id: string; name: string; type: "receita" | "despesa" };
type Supplier = { id: string; name: string };

export function TransactionDialog({
  categories,
  suppliers,
  initial,
  id,
  defaultType = "despesa",
  open: controlledOpen,
  onOpenChange,
}: {
  categories: Category[];
  suppliers: Supplier[];
  initial?: Partial<TransactionInput>;
  id?: string;
  defaultType?: "receita" | "despesa";
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;
  const today = todayISO();
  const { form, submit, pending, errorOf } = useActionForm({
    schema: transactionSchema,
    defaultValues: {
      type: defaultType,
      category_id: "",
      supplier_id: "",
      description: "",
      amount: "",
      competence_date: today,
      due_date: today,
      paid_date: "",
      nature: "",
      payment_method: "",
      document_number: "",
      notes: "",
      repeat_months: 1,
      ...initial,
    },
    action: (v) => saveTransaction({ ...v, id }),
    onSuccess: () => {
      setOpen(false);
      if (!id) form.reset();
    },
  });
  const type = form.watch("type");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!id && (
        <DialogTrigger asChild>
          <Button>
            <Plus /> Novo lançamento
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{id ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
          <DialogDescription>Contas a pagar e a receber. Informe a data de pagamento para lançar como liquidado.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Tipo" htmlFor="t_type" error={errorOf("type")} required>
              <NativeSelect id="t_type" {...form.register("type", { onChange: () => form.setValue("category_id", "") })}>
                <option value="despesa">Despesa (a pagar)</option>
                <option value="receita">Receita (a receber)</option>
              </NativeSelect>
            </FormField>
            <FormField label="Categoria" htmlFor="t_cat" error={errorOf("category_id")} required className="sm:col-span-2">
              <NativeSelect id="t_cat" {...form.register("category_id")}>
                <option value="">Selecione…</option>
                {categories
                  .filter((c) => c.type === type)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </NativeSelect>
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Descrição" htmlFor="t_desc" error={errorOf("description")} required className="sm:col-span-2">
              <Input id="t_desc" {...form.register("description")} />
            </FormField>
            <FormField label="Valor" htmlFor="t_amount" error={errorOf("amount")} required>
              <Input id="t_amount" type="number" step="0.01" min={0.01} {...form.register("amount")} />
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Competência" htmlFor="t_comp" error={errorOf("competence_date")} required hint="Mês de referência (DRE)">
              <Input id="t_comp" type="date" {...form.register("competence_date")} />
            </FormField>
            <FormField label="Vencimento" htmlFor="t_due" error={errorOf("due_date")} required>
              <Input id="t_due" type="date" {...form.register("due_date")} />
            </FormField>
            <FormField label="Data de pagamento" htmlFor="t_paid" error={errorOf("paid_date")} hint="Vazio = pendente">
              <Input id="t_paid" type="date" {...form.register("paid_date")} />
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {type === "despesa" && (
              <FormField label="Fornecedor" htmlFor="t_sup" error={errorOf("supplier_id")}>
                <NativeSelect id="t_sup" {...form.register("supplier_id")}>
                  <option value="">—</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
            )}
            <FormField label="Natureza" htmlFor="t_nat" error={errorOf("nature")} hint="Padrão da categoria">
              <NativeSelect id="t_nat" {...form.register("nature")}>
                <option value="">Padrão</option>
                {Object.entries(NATURE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Forma de pagamento" htmlFor="t_method" error={errorOf("payment_method")}>
              <NativeSelect id="t_method" {...form.register("payment_method")}>
                <option value="">—</option>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Nº do documento" htmlFor="t_doc" error={errorOf("document_number")}>
              <Input id="t_doc" {...form.register("document_number")} />
            </FormField>
            {!id && (
              <FormField label="Repetir por (meses)" htmlFor="t_rep" error={errorOf("repeat_months")} hint="Para despesas fixas recorrentes">
                <Input id="t_rep" type="number" min={1} max={24} {...form.register("repeat_months")} />
              </FormField>
            )}
          </div>
          <FormField label="Observações" htmlFor="t_notes" error={errorOf("notes")}>
            <Textarea id="t_notes" rows={2} {...form.register("notes")} />
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

export function TransactionRowActions({
  tx,
  categories,
  suppliers,
}: {
  tx: {
    id: string;
    status: "pendente" | "pago" | "cancelado";
    payment_id: string | null;
    initial: Partial<TransactionInput>;
  };
  categories: Category[];
  suppliers: Supplier[];
}) {
  const [settleOpen, setSettleOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message);
      after?.();
      router.refresh();
    });
  if (tx.payment_id) return <span className="text-xs text-muted-foreground">Mensalidade</span>;
  if (tx.status === "cancelado") return null;
  return (
    <div className="flex items-center justify-end gap-1">
      {tx.status === "pendente" && (
        <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <CheckCheck /> Liquidar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Liquidar lançamento</DialogTitle>
              <DialogDescription>Informe a data efetiva do pagamento/recebimento.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-1.5">
              <Label htmlFor="settle_date">Data</Label>
              <Input id="settle_date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <DialogFooter>
              <Button disabled={pending || !date} onClick={() => run(() => settleTransaction({ id: tx.id, paid_date: date }), () => setSettleOpen(false))}>
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label="Mais ações" disabled={pending}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem destructive onSelect={() => run(() => cancelTransaction({ id: tx.id }))}>
            <Ban /> Cancelar lançamento
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <TransactionDialog id={tx.id} initial={tx.initial} categories={categories} suppliers={suppliers} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
