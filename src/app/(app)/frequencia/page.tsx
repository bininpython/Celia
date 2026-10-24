import type { Metadata } from "next";
import Link from "next/link";
import { Activity, CalendarDays, Clock, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { PeriodFilter } from "@/components/shared/url-filters";
import { SimpleBars, TrendArea } from "@/components/charts/simple-charts";
import { CheckinHeatmap } from "@/components/charts/heatmap";
import { abandonRisk } from "@/lib/analytics/metrics";
import { requireModule } from "@/lib/auth";
import { addDays, diffDays, formatDate, formatDateTime, formatTime, monthRange, formatMonth, todayISO } from "@/lib/dates";
import { formatNumber, formatPhone } from "@/lib/format";
import { CHECKIN_METHOD_LABELS } from "@/lib/labels";
import { periodPresets, readPeriod } from "@/lib/period";
import { createClient } from "@/lib/supabase/server";
import { CheckinPanel } from "./checkin-panel";

export const metadata: Metadata = { title: "Frequência" };

const DAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export default async function AttendancePage({ searchParams }: PageProps<"/frequencia">) {
  await requireModule("frequencia");
  const sp = await searchParams;
  const today = todayISO();
  const { from, to } = readPeriod(sp, "6meses");
  const supabase = await createClient();

  const [students, todayList, daily, heat, attendance, gym] = await Promise.all([
    supabase.from("students").select("id, full_name, enrollment_code").eq("status", "ativo").order("full_name"),
    supabase
      .from("checkins")
      .select("id, checked_in_at, method, students(id, full_name)")
      .gte("checked_in_at", `${today}T00:00:00-03:00`)
      .order("checked_in_at", { ascending: false }),
    supabase.rpc("checkins_daily", { p_from: from, p_to: to }),
    supabase.rpc("checkins_heatmap", { p_from: from, p_to: to }),
    supabase.rpc("student_attendance", { p_days: 30 }),
    supabase.from("gyms").select("absence_alert_days").single(),
  ]);

  const days = daily.data ?? [];
  const total = days.reduce((a, d) => a + Number(d.total), 0);
  const weekFrom = addDays(today, -6);
  const week = days.filter((d) => d.day >= weekFrom).reduce((a, d) => a + Number(d.total), 0);
  const nDays = Math.max(1, diffDays(from, to < today ? to : today) + 1);
  const peak = [...(heat.data ?? [])].sort((a, b) => Number(b.total) - Number(a.total))[0];
  const threshold = gym.data?.absence_alert_days ?? 10;
  const absent = (attendance.data ?? [])
    .map((a) => ({ ...a, risk: abandonRisk(Number(a.days_since_last), Number(a.checkins_period)) }))
    .filter((a) => Number(a.days_since_last) >= threshold || a.risk === "alto")
    .sort((a, b) => Number(b.days_since_last) - Number(a.days_since_last));

  const last30 = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29)).map((d) => ({
    label: formatDate(d).slice(0, 5),
    value: Number(days.find((x) => x.day === d)?.total ?? 0),
  }));
  const monthly = monthRange(from, to).map((m) => ({
    label: formatMonth(m),
    value: days.filter((d) => d.day.startsWith(m.slice(0, 7))).reduce((a, d) => a + Number(d.total), 0),
  }));

  return (
    <>
      <PageHeader title="Frequência e check-in" description="Controle de entrada, ocupação e acompanhamento de ausências." actions={<PeriodFilter from={from} to={to} presets={periodPresets()} />} />
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <CheckinPanel students={students.data ?? []} />
        </div>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Entradas de hoje</CardTitle>
            <CardDescription>{todayList.data?.length ?? 0} registro(s)</CardDescription>
          </CardHeader>
          <CardContent className="max-h-72 space-y-2 overflow-y-auto text-sm">
            {!todayList.data?.length && <p className="text-muted-foreground">Nenhuma entrada registrada hoje.</p>}
            {todayList.data?.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2">
                <Link href={`/alunos/${c.students?.id}`} className="truncate hover:text-primary">
                  {c.students?.full_name}
                </Link>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Badge>{CHECKIN_METHOD_LABELS[c.method]}</Badge>
                  {formatTime(c.checked_in_at)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Hoje" value={formatNumber(todayList.data?.length ?? 0)} icon={Activity} tone="brand" />
        <StatCard label="Últimos 7 dias" value={formatNumber(week)} icon={CalendarDays} />
        <StatCard label="Média diária no período" value={(total / nDays).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} icon={Clock} hint={`${formatNumber(total)} check-ins`} />
        <StatCard
          label="Horário de pico"
          value={peak ? `${String(peak.hour).padStart(2, "0")}h` : "—"}
          icon={Clock}
          hint={peak ? `${DAY_NAMES[peak.dow]} · ${formatNumber(Number(peak.total))} entradas` : undefined}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Check-ins por dia</CardTitle>
            <CardDescription>Últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendArea data={last30} name="Check-ins" format="number" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Check-ins por mês</CardTitle>
            <CardDescription>Evolução de comparecimento no período</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBars data={monthly} name="Check-ins" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ocupação por dia e horário</CardTitle>
          <CardDescription>Mapa de calor dos check-ins no período</CardDescription>
        </CardHeader>
        <CardContent>
          <CheckinHeatmap data={(heat.data ?? []).map((h) => ({ dow: h.dow, hour: h.hour, total: Number(h.total) }))} />
        </CardContent>
      </Card>

      <Card className="pb-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="size-4 text-primary" /> Alunos ausentes e risco de abandono
          </CardTitle>
          <CardDescription>Ativos sem check-in há {threshold}+ dias ou com frequência muito baixa nos últimos 30 dias.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {!absent.length ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">Nenhum aluno ativo ausente no momento.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Último check-in</TableHead>
                  <TableHead className="text-right">Dias ausente</TableHead>
                  <TableHead className="text-right">Check-ins (30d)</TableHead>
                  <TableHead>Risco</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {absent.slice(0, 50).map((a) => (
                  <TableRow key={a.student_id}>
                    <TableCell>
                      <Link href={`/alunos/${a.student_id}`} className="font-medium hover:text-primary">
                        {a.full_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatPhone(a.phone)}</TableCell>
                    <TableCell>{a.last_checkin ? formatDateTime(a.last_checkin) : "Nunca"}</TableCell>
                    <TableCell className="text-right tabular-nums">{a.days_since_last}</TableCell>
                    <TableCell className="text-right tabular-nums">{a.checkins_period}</TableCell>
                    <TableCell>
                      <Badge tone={a.risk === "alto" ? "danger" : a.risk === "medio" ? "warning" : "success"}>
                        {a.risk === "alto" ? "Alto" : a.risk === "medio" ? "Médio" : "Baixo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
