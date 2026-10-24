"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { EVENT_KIND_LABELS, EVENT_STATUS } from "@/lib/labels";
import { eventSchema, type EventInput } from "@/lib/validators/admin";
import { addAttendee, removeAttendee, saveEvent, setEventStatus } from "./actions";

type Opt = { id: string; full_name: string };

export function EventDialog({ staff, students, defaultStart }: { staff: Opt[]; students: Opt[]; defaultStart: string }) {
  const [open, setOpen] = useState(false);
  const end = defaultStart.replace(/T(\d{2})/, (_, h) => `T${String(Math.min(23, Number(h) + 1)).padStart(2, "0")}`);
  const { form, submit, pending, errorOf } = useActionForm({
    schema: eventSchema,
    defaultValues: { title: "", kind: "aula", starts_at: defaultStart, ends_at: end, staff_id: "", student_id: "", location: "", capacity: "", description: "" } as EventInput,
    action: saveEvent,
    onSuccess: () => {
      setOpen(false);
      form.reset();
    },
  });
  const kind = form.watch("kind");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Novo compromisso
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo compromisso</DialogTitle>
          <DialogDescription>Aulas coletivas ficam visíveis no portal do aluno para inscrição.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Tipo" htmlFor="e_kind" error={errorOf("kind")}>
              <NativeSelect id="e_kind" {...form.register("kind")}>
                {Object.entries(EVENT_KIND_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Título" htmlFor="e_title" error={errorOf("title")} required className="sm:col-span-2">
              <Input id="e_title" {...form.register("title")} placeholder={kind === "avaliacao" ? "Avaliação física" : "Ex.: Funcional"} />
            </FormField>
            <FormField label="Início" htmlFor="e_start" error={errorOf("starts_at")} required className="sm:col-span-1">
              <Input id="e_start" type="datetime-local" {...form.register("starts_at")} />
            </FormField>
            <FormField label="Término" htmlFor="e_end" error={errorOf("ends_at")} required>
              <Input id="e_end" type="datetime-local" {...form.register("ends_at")} />
            </FormField>
            <FormField label="Responsável" htmlFor="e_staff" error={errorOf("staff_id")}>
              <NativeSelect id="e_staff" {...form.register("staff_id")}>
                <option value="">—</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            {kind === "aula" ? (
              <FormField label="Vagas" htmlFor="e_cap" error={errorOf("capacity")}>
                <Input id="e_cap" type="number" min={1} {...form.register("capacity")} />
              </FormField>
            ) : (
              <FormField label="Aluno" htmlFor="e_student" error={errorOf("student_id")} className="sm:col-span-2">
                <NativeSelect id="e_student" {...form.register("student_id")}>
                  <option value="">—</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
            )}
            <FormField label="Local" htmlFor="e_loc" error={errorOf("location")}>
              <Input id="e_loc" {...form.register("location")} />
            </FormField>
          </div>
          <FormField label="Descrição" htmlFor="e_desc" error={errorOf("description")}>
            <Textarea id="e_desc" rows={2} {...form.register("description")} />
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

export type AgendaEvent = {
  id: string;
  title: string;
  kind: keyof typeof EVENT_KIND_LABELS;
  status: keyof typeof EVENT_STATUS;
  time: string;
  staff: string | null;
  student: string | null;
  location: string | null;
  capacity: number | null;
  description: string | null;
  attendees: { id: string; full_name: string }[];
};

export function EventCard({ ev, students }: { ev: AgendaEvent; students: Opt[] }) {
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message);
      router.refresh();
    });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={`w-full rounded-md border-l-[3px] bg-card px-2.5 py-1.5 text-left text-xs shadow-xs transition-colors hover:bg-muted ${
            ev.kind === "aula" ? "border-l-primary" : ev.kind === "avaliacao" ? "border-l-[var(--chart-expense)]" : "border-l-[var(--chart-third)]"
          } ${ev.status === "cancelado" ? "opacity-50 line-through" : ""}`}
        >
          <span className="font-medium">{ev.time}</span> · {ev.title}
          {ev.kind === "aula" && ev.capacity && (
            <span className="block text-muted-foreground">
              {ev.attendees.length}/{ev.capacity} vagas
            </span>
          )}
          {ev.student && <span className="block truncate text-muted-foreground">{ev.student}</span>}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ev.title}</DialogTitle>
          <DialogDescription>
            {EVENT_KIND_LABELS[ev.kind]} · {ev.time}
            {ev.staff && ` · ${ev.staff}`}
            {ev.location && ` · ${ev.location}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <Badge tone={EVENT_STATUS[ev.status].tone}>{EVENT_STATUS[ev.status].label}</Badge>
          {ev.description && <p className="text-muted-foreground">{ev.description}</p>}
          {ev.kind === "aula" && (
            <div className="space-y-2">
              <p className="font-medium">
                Inscritos ({ev.attendees.length}
                {ev.capacity ? `/${ev.capacity}` : ""})
              </p>
              <ul className="space-y-1">
                {ev.attendees.map((a) => (
                  <li key={a.id} className="flex items-center justify-between">
                    {a.full_name}
                    <Button size="icon-sm" variant="ghost" aria-label={`Remover ${a.full_name}`} disabled={pending} onClick={() => run(() => removeAttendee({ event_id: ev.id, student_id: a.id }))}>
                      <X />
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <NativeSelect aria-label="Inscrever aluno" value={studentId} onChange={(e) => setStudentId(e.target.value)} className="flex-1">
                  <option value="">Inscrever aluno…</option>
                  {students
                    .filter((s) => !ev.attendees.some((a) => a.id === s.id))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                      </option>
                    ))}
                </NativeSelect>
                <Button variant="outline" disabled={!studentId || pending} onClick={() => run(() => addAttendee({ event_id: ev.id, student_id: studentId }))}>
                  Inscrever
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          {ev.status !== "cancelado" && (
            <Button variant="outline" disabled={pending} onClick={() => run(() => setEventStatus({ id: ev.id, status: "cancelado" }))}>
              <X /> Cancelar
            </Button>
          )}
          {ev.status === "agendado" && (
            <Button disabled={pending} onClick={() => run(() => setEventStatus({ id: ev.id, status: "concluido" }))}>
              <Check /> Concluir
            </Button>
          )}
          {ev.status !== "agendado" && (
            <Button variant="outline" disabled={pending} onClick={() => run(() => setEventStatus({ id: ev.id, status: "agendado" }))}>
              Reabrir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
