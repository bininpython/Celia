import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { PeriodFilter } from "@/components/shared/url-filters";
import { buildDre } from "@/lib/finance/dre";
import { formatDate } from "@/lib/dates";
import { formatCurrency, formatPercent } from "@/lib/format";
import { percentChange } from "@/lib/analytics/metrics";
import { periodPresets, readPeriod } from "@/lib/period";
import { previousPeriod } from "@/lib/queries/finance";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "DRE gerencial" };

export default async function DrePage({ searchParams }: PageProps<"/financeiro/dre">) {
  const sp = await searchParams;
  const { from, to } = readPeriod(sp);
  const basis = sp.regime === "competencia" ? "competencia" : "caixa";
  const prev = previousPeriod(from, to);
  const supabase = await createClient();
  const [cur, old] = await Promise.all([
    supabase.rpc("fin_by_category", { p_from: from, p_to: to, p_basis: basis }),
    supabase.rpc("fin_by_category", { p_from: prev.from, p_to: prev.to, p_basis: basis }),
  ]);
  const map = (rows: typeof cur.data) => (rows ?? []).map((r) => ({ ...r, total: Number(r.total) }));
  const dre = buildDre(map(cur.data));
  const dreOld = buildDre(map(old.data));
  const qs = (r: string) => `?de=${from}&ate=${to}&regime=${r}`;

  return (
    <>
      <PageHeader
        title="DRE gerencial"
        description="Demonstração do resultado — mostra de onde vem o dinheiro, para onde vai e quanto sobra."
        actions={
          <>
            <div className="flex rounded-md border p-0.5" role="group" aria-label="Regime">
              {(["caixa", "competencia"] as const).map((r) => (
                <Link key={r} href={qs(r)} className={cn("rounded px-3 py-1 text-sm", r === basis ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground")}>
                  {r === "caixa" ? "Caixa" : "Competência"}
                </Link>
              ))}
            </div>
            <PeriodFilter from={from} to={to} presets={periodPresets()} />
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="gap-1 py-4">
          <CardContent className="px-4">
            <p className="text-sm text-muted-foreground">Receita bruta</p>
            <p className="text-2xl font-semibold tabular-nums">{formatCurrency(dre.receitaBruta)}</p>
          </CardContent>
        </Card>
        <Card className="gap-1 py-4">
          <CardContent className="px-4">
            <p className="text-sm text-muted-foreground">Margem de contribuição</p>
            <p className="text-2xl font-semibold tabular-nums">{formatPercent(dre.margemPercent)}</p>
          </CardContent>
        </Card>
        <Card className="gap-1 py-4">
          <CardContent className="px-4">
            <p className="text-sm text-muted-foreground">Margem líquida</p>
            <p className={cn("text-2xl font-semibold tabular-nums", dre.final < 0 && "text-destructive")}>{formatPercent(dre.finalPercent)}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {formatDate(from)} a {formatDate(to)} · regime de {basis === "caixa" ? "caixa" : "competência"}
          </CardTitle>
          <CardDescription>
            Comparação com {formatDate(prev.from)} a {formatDate(prev.to)}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground uppercase">
                <th className="py-2 text-left font-medium">Conta</th>
                <th className="py-2 text-right font-medium">Período</th>
                <th className="py-2 text-right font-medium">Anterior</th>
                <th className="py-2 text-right font-medium">Var.</th>
              </tr>
            </thead>
            <tbody>
              {dre.lines.map((l, i) => {
                const oldV = dreOld.lines[i]!.value;
                const ch = percentChange(l.value, oldV);
                return (
                  <FragmentRows key={l.key}>
                    <tr className={cn("border-b", l.kind === "subtotal" && "bg-muted/50 font-medium", l.kind === "total" && "bg-accent font-semibold text-accent-foreground")}>
                      <td className="py-2 pl-2">{l.label}</td>
                      <td className={cn("py-2 text-right tabular-nums", l.value < 0 && l.kind !== "group" && "text-destructive")}>{formatCurrency(l.value)}</td>
                      <td className="py-2 text-right text-muted-foreground tabular-nums">{formatCurrency(oldV)}</td>
                      <td className="py-2 pr-2 text-right text-muted-foreground tabular-nums">{ch == null ? "—" : formatPercent(ch)}</td>
                    </tr>
                    {l.details?.map((d) => (
                      <tr key={`${l.key}-${d.label}`} className="border-b text-muted-foreground">
                        <td className="py-1.5 pl-8">{d.label}</td>
                        <td className="py-1.5 text-right tabular-nums">{formatCurrency(d.value)}</td>
                        <td />
                        <td />
                      </tr>
                    ))}
                  </FragmentRows>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

function FragmentRows({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
