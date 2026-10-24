import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Dumbbell, ScanLine, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireModule } from "@/lib/auth";
import { formatDate, formatDateTime, startOfMonth, todayISO } from "@/lib/dates";
import { displayStatus, invoiceTotal } from "@/lib/finance/invoice";
import { formatCurrency } from "@/lib/format";
import { INVOICE_STATUS, MEMBERSHIP_STATUS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { CheckinQr, ReadNoticesButton } from "./portal-client";

export const metadata: Metadata = { title: "Portal do aluno" };

export default async function PortalHome() {
  const user = await requireModule("portal");
  if (!user.studentId) return null;
  const supabase = await createClient();
  const today = todayISO();
  const [student, membership, nextInvoice, checkins, workout, notices, classes] = await Promise.all([
    supabase.from("students").select("full_name, enrollment_code, status").eq("id", user.studentId).single(),
    supabase.from("memberships").select("status, start_date, end_date, plans(name)").eq("student_id", user.studentId).in("status", ["ativa", "suspensa"]).maybeSingle(),
    supabase.from("invoices").select("*").eq("student_id", user.studentId).eq("status", "pendente").order("due_date").limit(1).maybeSingle(),
    supabase.from("checkins").select("id", { count: "exact", head: true }).eq("student_id", user.studentId).gte("checked_in_at", `${startOfMonth(today)}T00:00:00-03:00`),
    supabase.from("workout_plans").select("id, title, workout_divisions(label)").eq("student_id", user.studentId).eq("active", true).order("start_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("notifications").select("*").eq("audience", "student").order("created_at", { ascending: false }).limit(5),
    supabase.from("event_attendees").select("events(id, title, starts_at)").eq("student_id", user.studentId),
  ]);
  const upcoming = (classes.data ?? [])
    .map((c) => c.events)
    .filter((e): e is NonNullable<typeof e> => !!e && e.starts_at >= new Date().toISOString())
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .slice(0, 3);
  const inv = nextInvoice.data;
  const unread = (notices.data ?? []).some((n) => !n.read_at);

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Olá, {student.data?.full_name.split(" ")[0]}!</h1>
        <p className="text-sm text-muted-foreground">Matrícula {student.data?.enrollment_code}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:row-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="size-4 text-primary" /> Check-in
            </CardTitle>
            <CardDescription>Apresente na recepção para registrar sua entrada.</CardDescription>
          </CardHeader>
          <CardContent>
            {student.data?.status === "ativo" ? <CheckinQr /> : <p className="text-sm text-muted-foreground">Check-in indisponível: cadastro não está ativo. Procure a recepção.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="size-4 text-primary" /> Próxima mensalidade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {inv ? (
              <>
                <p className="text-2xl font-semibold tabular-nums">{formatCurrency(invoiceTotal(inv))}</p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  Vencimento {formatDate(inv.due_date)} <StatusBadge map={INVOICE_STATUS} value={displayStatus(inv, today)} />
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">Nenhuma mensalidade em aberto.</p>
            )}
            <Link href="/portal/mensalidades" className="inline-flex items-center gap-1 text-primary hover:underline">
              Ver mensalidades <ArrowRight className="size-3.5" />
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Meu plano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {membership.data ? (
              <>
                <p className="flex items-center gap-2 font-medium">
                  {membership.data.plans?.name} <StatusBadge map={MEMBERSHIP_STATUS} value={membership.data.status} />
                </p>
                <p className="text-muted-foreground">Desde {formatDate(membership.data.start_date)}</p>
              </>
            ) : (
              <p className="text-muted-foreground">Sem plano ativo.</p>
            )}
            <p className="pt-1 text-muted-foreground">{checkins.count ?? 0} check-in(s) neste mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Dumbbell className="size-4 text-primary" /> Treino atual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {workout.data ? (
              <>
                <p className="font-medium">{workout.data.title}</p>
                <p className="text-muted-foreground">Divisões {workout.data.workout_divisions.map((d) => d.label).join(", ")}</p>
                <Button size="sm" asChild>
                  <Link href="/portal/treinos">Abrir ficha</Link>
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">Seu professor ainda não cadastrou uma ficha.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4 text-primary" /> Próximas aulas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {!upcoming.length && <p className="text-muted-foreground">Nenhuma inscrição.</p>}
            {upcoming.map((e) => (
              <p key={e.id}>
                {e.title} <span className="text-muted-foreground">· {formatDateTime(e.starts_at)}</span>
              </p>
            ))}
            <Link href="/portal/agenda" className="inline-flex items-center gap-1 text-primary hover:underline">
              Ver agenda <ArrowRight className="size-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>
      <Card id="avisos">
        <CardHeader>
          <CardTitle className="text-base">Avisos</CardTitle>
          {unread && (
            <CardAction>
              <ReadNoticesButton />
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!notices.data?.length && <p className="text-muted-foreground">Nenhum aviso. Você pode autorizar avisos de vencimento em “Meus dados”.</p>}
          {notices.data?.map((n) => (
            <div key={n.id} className="flex items-start justify-between gap-3">
              <span>
                {!n.read_at && <Badge tone="brand" className="mr-2">Novo</Badge>}
                <strong className="font-medium">{n.title}</strong> — {n.body}
              </span>
              <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDate(n.created_at)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
