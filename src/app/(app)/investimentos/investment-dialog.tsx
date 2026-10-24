"use client";
import { useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { INVESTMENT_KIND_LABELS, INVESTMENT_STATUS } from "@/lib/labels";
import { investmentSchema, type InvestmentInput } from "@/lib/validators/finance";
import { saveInvestment } from "./actions";

export function InvestmentDialog({ investment, preset }: { investment?: InvestmentInput & { id: string }; preset?: Partial<InvestmentInput> }) {
  const [open, setOpen] = useState(false);
  const { form, submit, pending, errorOf } = useActionForm({
    schema: investmentSchema,
    defaultValues: investment ?? {
      name: "",
      kind: "equipamento",
      amount: "",
      invested_at: "",
      expected_monthly_return: "",
      expected_monthly_cost: "",
      useful_life_months: "",
      status: "planejado",
      notes: "",
      ...preset,
    },
    action: (v) => saveInvestment({ ...v, id: investment?.id }),
    onSuccess: () => setOpen(false),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {investment ? (
          <Button size="icon-sm" variant="ghost" aria-label={`Editar ${investment.name}`}>
            <Pencil />
          </Button>
        ) : (
          <Button variant={preset ? "outline" : "default"}>
            <Plus /> {preset ? "Salvar simulação como investimento" : "Novo investimento"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{investment ? "Editar investimento" : "Novo investimento"}</DialogTitle>
          <DialogDescription>Investimentos executados são lançados como saída no financeiro.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <FormField label="Descrição" htmlFor="i_name" error={errorOf("name")} required>
            <Input id="i_name" placeholder="Ex.: Nova esteira" {...form.register("name")} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Tipo" htmlFor="i_kind" error={errorOf("kind")}>
              <NativeSelect id="i_kind" {...form.register("kind")}>
                {Object.entries(INVESTMENT_KIND_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Valor investido" htmlFor="i_amount" error={errorOf("amount")} required>
              <Input id="i_amount" type="number" step="0.01" min={0.01} {...form.register("amount")} />
            </FormField>
            <FormField label="Situação" htmlFor="i_status" error={errorOf("status")}>
              <NativeSelect id="i_status" {...form.register("status")}>
                {Object.entries(INVESTMENT_STATUS).map(([v, s]) => (
                  <option key={v} value={v}>
                    {s.label}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Retorno mensal esperado" htmlFor="i_ret" error={errorOf("expected_monthly_return")} hint="Receita adicional estimada">
              <Input id="i_ret" type="number" step="0.01" min={0} {...form.register("expected_monthly_return")} />
            </FormField>
            <FormField label="Custo mensal adicional" htmlFor="i_cost" error={errorOf("expected_monthly_cost")}>
              <Input id="i_cost" type="number" step="0.01" min={0} {...form.register("expected_monthly_cost")} />
            </FormField>
            <FormField label="Vida útil (meses)" htmlFor="i_life" error={errorOf("useful_life_months")}>
              <Input id="i_life" type="number" min={1} {...form.register("useful_life_months")} />
            </FormField>
          </div>
          <FormField label="Data do investimento" htmlFor="i_date" error={errorOf("invested_at")}>
            <Input id="i_date" type="date" {...form.register("invested_at")} />
          </FormField>
          <FormField label="Observações" htmlFor="i_notes" error={errorOf("notes")}>
            <Textarea id="i_notes" rows={2} {...form.register("notes")} />
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
