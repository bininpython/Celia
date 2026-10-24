import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { requireModule } from "@/lib/auth";
import { addDays, formatDateTime, formatTime, todayISO } from "@/lib/dates";
import { EVENT_KIND_LABELS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { ClassToggle } from "../portal-client";

export const metadata: Metadata = { title: "Agenda" };

export default async function MyAgendaPage() {
  const user = await requireModule("portal");
  const supabase = await createClient();
  const today = todayISO();
  const { data: events } = await supabase
    .from("events")
    .select("id, title, kind, starts_at, ends_at, location, capacity, student_id, status, event_attendees(student_id)")
    .gte("starts_at", new Date().toISOString())
    .lte("starts_at", `${addDays(today, 30)}T23:59:59-03:00`)
    .neq("status", "cancelado")
    .order("starts_at");
  return (
    <>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Agenda</h1>
        <p className="text-sm text-muted-foreground">Aulas disponíveis e seus compromissos nos próximos 30 dias.</p>
      </div>
      {!events?.length ? (
        <EmptyState icon={CalendarDays} title="Nada agendado" />
      ) : (
        <div className="space-y-2">
          {events.map((e) => {
            const joined = e.event_attendees.some((a) => a.student_id === user.studentId);
            const full = !!e.capacity && e.event_attendees.length >= e.capacity;
            return (
              <Card key={e.id} className="py-3">
                <CardContent className="flex flex-col gap-2 px-4 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <p className="font-medium">
                      {e.title} <Badge className="ml-1">{EVENT_KIND_LABELS[e.kind]}</Badge>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(e.starts_at)}–{formatTime(e.ends_at)}
                      {e.location && ` · ${e.location}`}
                      {e.capacity && ` · ${e.event_attendees.length}/${e.capacity} vagas`}
                    </p>
                  </div>
                  {e.kind === "aula" ? <ClassToggle eventId={e.id} joined={joined} full={full} /> : <Badge tone="brand">Seu compromisso</Badge>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
