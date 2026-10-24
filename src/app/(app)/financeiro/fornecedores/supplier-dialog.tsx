"use client";
import { useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { supplierSchema, type SupplierInput } from "@/lib/validators/finance";
import { saveSupplier } from "../actions";

export function SupplierDialog({ supplier }: { supplier?: SupplierInput & { id: string } }) {
  const [open, setOpen] = useState(false);
  const { form, submit, pending, errorOf } = useActionForm({
    schema: supplierSchema,
    defaultValues: supplier ?? { name: "", document: "", email: "", phone: "", category: "", notes: "", active: true },
    action: (v) => saveSupplier({ ...v, id: supplier?.id }),
    onSuccess: () => {
      setOpen(false);
      if (!supplier) form.reset();
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {supplier ? (
          <Button size="icon-sm" variant="ghost" aria-label={`Editar ${supplier.name}`}>
            <Pencil />
          </Button>
        ) : (
          <Button>
            <Plus /> Novo fornecedor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplier ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
          <DialogDescription>Vincule fornecedores às despesas para analisar gastos.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <FormField label="Nome / razão social" htmlFor="s_name" error={errorOf("name")} required>
            <Input id="s_name" {...form.register("name")} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="CNPJ / CPF" htmlFor="s_doc" error={errorOf("document")}>
              <Input id="s_doc" {...form.register("document")} />
            </FormField>
            <FormField label="Segmento" htmlFor="s_cat" error={errorOf("category")}>
              <Input id="s_cat" placeholder="Ex.: manutenção" {...form.register("category")} />
            </FormField>
            <FormField label="E-mail" htmlFor="s_email" error={errorOf("email")}>
              <Input id="s_email" type="email" {...form.register("email")} />
            </FormField>
            <FormField label="Telefone" htmlFor="s_phone" error={errorOf("phone")}>
              <Input id="s_phone" {...form.register("phone")} />
            </FormField>
          </div>
          <FormField label="Observações" htmlFor="s_notes" error={errorOf("notes")}>
            <Textarea id="s_notes" rows={2} {...form.register("notes")} />
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
