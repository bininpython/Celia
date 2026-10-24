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
import { FormField } from "@/components/shared/form-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { DRE_GROUP_LABELS, NATURE_LABELS } from "@/lib/labels";
import { categorySchema, type CategoryInput } from "@/lib/validators/finance";
import { saveCategory, toggleCategory } from "../actions";

export function CategoryDialog({ category }: { category?: CategoryInput & { id: string } }) {
  const [open, setOpen] = useState(false);
  const { form, submit, pending, errorOf } = useActionForm({
    schema: categorySchema,
    defaultValues: category ?? { name: "", type: "despesa", nature: "variavel", dre_group: "custo_variavel", color: "" },
    action: (v) => saveCategory({ ...v, id: category?.id }),
    onSuccess: () => setOpen(false),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {category ? (
          <Button size="icon-sm" variant="ghost" aria-label={`Editar ${category.name}`}>
            <Pencil />
          </Button>
        ) : (
          <Button>
            <Plus /> Nova categoria
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          <DialogDescription>O grupo do DRE define em qual linha do resultado a categoria aparece.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <FormField label="Nome" htmlFor="c_name" error={errorOf("name")} required>
            <Input id="c_name" {...form.register("name")} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Tipo" htmlFor="c_type" error={errorOf("type")}>
              <NativeSelect
                id="c_type"
                {...form.register("type", {
                  onChange: (e) => form.setValue("dre_group", e.target.value === "receita" ? "receita_operacional" : "custo_variavel"),
                })}
              >
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
              </NativeSelect>
            </FormField>
            <FormField label="Natureza" htmlFor="c_nat" error={errorOf("nature")}>
              <NativeSelect id="c_nat" {...form.register("nature")}>
                {Object.entries(NATURE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Grupo no DRE" htmlFor="c_dre" error={errorOf("dre_group")}>
              <NativeSelect id="c_dre" {...form.register("dre_group")}>
                {Object.entries(DRE_GROUP_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
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

export function CategoryToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Switch
      checked={active}
      disabled={pending}
      aria-label={active ? "Desativar categoria" : "Ativar categoria"}
      onCheckedChange={(v) =>
        start(async () => {
          const r = await toggleCategory({ id, active: v });
          if (!r.ok) return void toast.error(r.error);
          toast.success(r.message);
          router.refresh();
        })
      }
    />
  );
}
