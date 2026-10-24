"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { PERIODICITY_LABELS, PERIODICITY_MONTHS } from "@/lib/labels";
import { planSchema, type PlanInput } from "@/lib/validators/billing";
import { savePlan, togglePlan } from "./actions";

export function PlanDialog({ plan }: { plan?: PlanInput & { id: string } }) {
  const [open, setOpen] = useState(false);
  const { form, submit, pending, errorOf } = useActionForm({
    schema: planSchema,
    defaultValues: plan ?? { name: "", periodicity: "mensal", duration_months: 1, price: "", weekly_frequency: "", description: "", active: true },
    action: (v) => savePlan({ ...v, id: plan?.id }),
    onSuccess: () => setOpen(false),
  });
  const periodicity = form.watch("periodicity");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {plan ? (
          <Button size="icon-sm" variant="ghost" aria-label={`Editar ${plan.name}`}>
            <Pencil />
          </Button>
        ) : (
          <Button>
            <Plus /> Novo plano
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{plan ? "Editar plano" : "Novo plano"}</DialogTitle>
          <DialogDescription>O preço é o valor cobrado a cada ciclo (ex.: trimestral = valor dos 3 meses).</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <FormField label="Nome" htmlFor="p_name" error={errorOf("name")} required>
            <Input id="p_name" {...form.register("name")} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Periodicidade" htmlFor="p_per" error={errorOf("periodicity")} required>
              <NativeSelect
                id="p_per"
                {...form.register("periodicity", {
                  onChange: (e) => {
                    const m = PERIODICITY_MONTHS[e.target.value as keyof typeof PERIODICITY_MONTHS];
                    if (m) form.setValue("duration_months", m);
                  },
                })}
              >
                {Object.entries(PERIODICITY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Duração (meses)" htmlFor="p_dur" error={errorOf("duration_months")} required>
              <Input id="p_dur" type="number" min={1} max={36} readOnly={periodicity !== "personalizado"} {...form.register("duration_months")} />
            </FormField>
            <FormField label="Preço do ciclo" htmlFor="p_price" error={errorOf("price")} required>
              <Input id="p_price" type="number" step="0.01" min={0} {...form.register("price")} />
            </FormField>
          </div>
          <FormField label="Frequência semanal (opcional)" htmlFor="p_freq" error={errorOf("weekly_frequency")} hint="Vezes por semana incluídas">
            <Input id="p_freq" type="number" min={1} max={7} {...form.register("weekly_frequency")} />
          </FormField>
          <FormField label="Descrição" htmlFor="p_desc" error={errorOf("description")}>
            <Textarea id="p_desc" rows={2} {...form.register("description")} />
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

export function PlanToggle({ id, active, name }: { id: string; active: boolean; name: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Switch
      checked={active}
      disabled={pending}
      aria-label={`${active ? "Desativar" : "Ativar"} ${name}`}
      onCheckedChange={(v) =>
        start(async () => {
          const r = await togglePlan({ id, active: v });
          if (!r.ok) return void toast.error(r.error);
          toast.success(r.message);
          router.refresh();
        })
      }
    />
  );
}
