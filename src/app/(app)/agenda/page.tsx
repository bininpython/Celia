import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { requireModule } from "@/lib/auth";
import { addDays, formatDate, formatTime, isoDateInGymTz, parseISODate, todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { EventCard, EventDialog, type AgendaEvent } from "./event-dialog";

export const metadata: Metadata = { title: "Agenda" };
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function weekStart(iso: string) {
  const { y, m, d } = parseISODate(iso);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addDays(iso, -((dow + 6) % 7)); // segunda-feira
}

export default async function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  await requireModule("agenda");
  const sp = await searchParams;
  const today = todayISO();
  const ref = typeof sp.semana === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.semana) ? sp.semana : today;
  const start = weekStart(ref);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const supabase = await createClient();
  const [{ data: events }, { data: staff }, { data: students }] = await Promise.all([
    supabase
      .from("events")
      .select("*, students(full_name), event_attendees(student_id, students(id, full_name))")
      .gte("starts_at", `${start}T00:00:00-03:00`)
      .lte("starts_at", `${days[6]}T23:59:59-03:00`)
      .order("starts_at"),
    supabase.from("staff_directory").select("id, full_name").eq("active", true).order("full_name"),
    supabase.from("students").select("id, full_name").eq("status", "ativo").order("full_name"),
  ]);
  const staffOpts = (staff ?? []).filter((s): s is { id: string; full_name: string } => !!s.id && !!s.full_name);
  const staffName = new Map(staffOpts.map((s) => [s.id, s.full_name]));
  const byDay = new Map<string, AgendaEvent[]>();
  (events ?? []).forEach((e) => {
    const day = isoDateInGymTz(e.starts_at);
    const list = byDay.get(day) ?? [];
    list.push({
      id: e.id,
      title: e.title,
      kind: e.kind,
      status: e.status,
      time: `${formatTime(e.starts_at)}–${formatTime(e.ends_at)}`,
      staff: e.staff_id ? (staffName.get(e.staff_id) ?? null) : null,
      student: e.students?.full_name ?? null,
      location: e.location,
      capacity: e.capacity,
      description: e.description,
      attendees: e.event_attendees.map((a) => a.students).filter((s): s is { id: string; full_name: string } => !!s),
    });
    byDay.set(day, list);
  });

  return (
    <>
      <PageHeader
        title="Agenda"
        description={`Semana de ${formatDate(days[0])} a ${formatDate(days[6])}`}
        actions={
          <>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" asChild>
                <Link href={`?semana=${addDays(start, -7)}`} aria-label="Semana anterior">
                  <ChevronLeft />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/agenda">Hoje</Link>
              </Button>
              <Button variant="outline" size="icon" asChild>
                <Link href={`?semana=${addDays(start, 7)}`} aria-label="Próxima semana">
                  <ChevronRight />
                </Link>
              </Button>
            </div>
            <EventDialog staff={staffOpts} students={students ?? []} defaultStart={`${today}T08:00`} />
          </>
        }
      />
      <div className="grid gap-3 md:grid-cols-7">
        {days.map((d, i) => {
          const list = byDay.get(d) ?? [];
          return (
            <section key={d} aria-label={formatDate(d)} className={cn("min-h-36 rounded-lg border bg-muted/30 p-2", d === today && "border-primary/50 bg-accent/40")}>
              <h2 className="mb-2 flex items-baseline justify-between px-1 text-xs font-medium text-muted-foreground">
                <span>{WEEKDAYS[(i + 1) % 7]}</span>
                <span className={cn("text-sm", d === today && "font-semibold text-primary")}>{d.slice(8)}</span>
              </h2>
              <div className="space-y-1.5">
                {list.map((ev) => (
                  <EventCard key={ev.id} ev={ev} students={students ?? []} />
                ))}
                {!list.length && <p className="px-1 text-xs text-muted-foreground/70">—</p>}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
