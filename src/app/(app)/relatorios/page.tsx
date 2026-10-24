import type { Metadata } from "next";
import { FileSpreadsheet, FileText, Sheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { PeriodFilter } from "@/components/shared/url-filters";
import { requireModule } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { periodPresets, readPeriod } from "@/lib/period";
import { REPORTS } from "@/lib/reports/definitions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Relatórios" };

export default async function ReportsPage({ searchParams }: PageProps<"/relatorios">) {
  await requireModule("relatorios");
  const sp = await searchParams;
  const { from, to } = readPeriod(sp);
  const supabase = await createClient();
  const { data: recent } = await supabase.from("report_exports").select("report_type, format, created_at").order("created_at", { ascending: false }).limit(8);
  const groups = ["Financeiro", "Operacional", "Treinos"] as const;
  const entries = Object.entries(REPORTS);

  return (
    <>
      <PageHeader title="Relatórios" description="Exportação em PDF, Excel e CSV com os dados reais do sistema." actions={<PeriodFilter from={from} to={to} presets={periodPresets()} />} />
      {groups.map((g) => (
        <section key={g} className="space-y-3">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">{g}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {entries
              .filter(([, d]) => d.group === g)
              .map(([key, d]) => {
                const qs = d.usesPeriod ? `&de=${from}&ate=${to}` : "";
                return (
                  <Card key={key} className="gap-3">
                    <CardHeader>
                      <CardTitle className="text-base">{d.label}</CardTitle>
                      <CardDescription>
                        {d.description}
                        {!d.usesPeriod && " Independe do período."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={`/api/relatorios/${key}?formato=pdf${qs}`}>
                          <FileText /> PDF
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href={`/api/relatorios/${key}?formato=xlsx${qs}`}>
                          <FileSpreadsheet /> Excel
                        </a>
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <a href={`/api/relatorios/${key}?formato=csv${qs}`}>
                          <Sheet /> CSV
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </section>
      ))}
      {!!recent?.length && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exportações recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {recent.map((r, i) => (
              <div key={i} className="flex justify-between text-muted-foreground">
                <span>
                  {REPORTS[r.report_type as keyof typeof REPORTS]?.label ?? r.report_type} · {r.format.toUpperCase()}
                </span>
                <span>{formatDateTime(r.created_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}
