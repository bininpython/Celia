import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleBars } from "@/components/charts/simple-charts";
import { requireModule } from "@/lib/auth";
import { addMonths, formatDateTime, formatMonth, isoDateInGymTz, monthRange, startOfMonth, todayISO } from "@/lib/dates";
import { CHECKIN_METHOD_LABELS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Minha frequência" };

export default async function MyAttendancePage() {
  const user = await requireModule("portal");
  const supabase = await createClient();
  const today = todayISO();
  const from = addMonths(startOfMonth(today), -11);
  const { data } = await supabase.from("checkins").select("id, checked_in_at, method").eq("student_id", user.studentId!).gte("checked_in_at", `${from}T00:00:00-03:00`).order("checked_in_at", { ascending: false });
  const months = monthRange(from, today).map((m) => ({ label: formatMonth(m), value: (data ?? []).filter((c) => isoDateInGymTz(c.checked_in_at).startsWith(m.slice(0, 7))).length }));
  const thisMonth = months.at(-1)?.value ?? 0;
  return (
    <>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Minha frequência</h1>
        <p className="text-sm text-muted-foreground">
          {thisMonth} treino(s) neste mês · {data?.length ?? 0} nos últimos 12 meses
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Treinos por mês</CardTitle>
          <CardDescription>Últimos 12 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleBars data={months} name="Check-ins" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Últimas entradas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {!data?.length && <p className="text-muted-foreground">Nenhum registro.</p>}
          {(data ?? []).slice(0, 20).map((c) => (
            <div key={c.id} className="flex justify-between">
              <span>{formatDateTime(c.checked_in_at)}</span>
              <span className="text-muted-foreground">{CHECKIN_METHOD_LABELS[c.method]}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
