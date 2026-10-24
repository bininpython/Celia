"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { EQUIPMENT, MUSCLE_GROUPS } from "@/lib/labels";
import { exerciseSchema, type ExerciseInput } from "@/lib/validators/training";
import { saveExercise, toggleExercise } from "./actions";

export function ExerciseDialog({ exercise }: { exercise?: ExerciseInput & { id: string } }) {
  const [open, setOpen] = useState(false);
  const { form, submit, pending, errorOf } = useActionForm({
    schema: exerciseSchema,
    defaultValues: exercise ?? { name: "", muscle_group: "", equipment: "", instructions: "", video_url: "" },
    action: (v) => saveExercise({ ...v, id: exercise?.id }),
    onSuccess: () => {
      setOpen(false);
      if (!exercise) form.reset();
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {exercise ? (
          <Button size="icon-sm" variant="ghost" aria-label={`Editar ${exercise.name}`}>
            <Pencil />
          </Button>
        ) : (
          <Button>
            <Plus /> Novo exercício
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{exercise ? "Editar exercício" : "Novo exercício"}</DialogTitle>
          <DialogDescription>Biblioteca usada na montagem das fichas.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <FormField label="Nome" htmlFor="ex_name" error={errorOf("name")} required>
            <Input id="ex_name" {...form.register("name")} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Grupo muscular" htmlFor="ex_group" error={errorOf("muscle_group")} required>
              <NativeSelect id="ex_group" {...form.register("muscle_group")}>
                <option value="">Selecione…</option>
                {Object.entries(MUSCLE_GROUPS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Equipamento" htmlFor="ex_eq" error={errorOf("equipment")} required>
              <NativeSelect id="ex_eq" {...form.register("equipment")}>
                <option value="">Selecione…</option>
                {Object.entries(EQUIPMENT).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
          <FormField label="Instruções de execução" htmlFor="ex_inst" error={errorOf("instructions")}>
            <Textarea id="ex_inst" rows={3} {...form.register("instructions")} />
          </FormField>
          <FormField label="Link de vídeo (opcional)" htmlFor="ex_video" error={errorOf("video_url")}>
            <Input id="ex_video" type="url" placeholder="https://" {...form.register("video_url")} />
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

export function ExerciseToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Switch
      checked={active}
      disabled={pending}
      aria-label={active ? "Desativar" : "Ativar"}
      onCheckedChange={(v) =>
        start(async () => {
          const r = await toggleExercise({ id, active: v });
          if (!r.ok) return void toast.error(r.error);
          toast.success(r.message);
          router.refresh();
        })
      }
    />
  );
}
