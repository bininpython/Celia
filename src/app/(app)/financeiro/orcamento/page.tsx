import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { addMonths, formatMonth, startOfMonth, todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { BudgetForm } from "./budget-form";

export const metadata: Metadata = { title: "Orçamento" };

export default async function BudgetPage({ searchParams }: PageProps<"/financeiro/orcamento">) {
  const sp = await searchParams;
  const month = typeof sp.mes === "string" && /^\d{4}-\d{2}$/.test(sp.mes) ? `${sp.mes}-01` : startOfMonth(todayISO());
  const supabase = await createClient();
  const { data } = await supabase.rpc("budget_vs_actual", { p_month: month });
  const prev = addMonths(month, -1);
  const next = addMonths(month, 1);
  return (
    <>
      <PageHeader
        title="Orçamento: previsto x realizado"
        description="Defina metas mensais por categoria e acompanhe a execução (regime de competência)."
        actions={
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" asChild>
              <Link href={`?mes=${prev.slice(0, 7)}`} aria-label="Mês anterior">
                <ChevronLeft />
              </Link>
            </Button>
            <span className="w-36 text-center text-sm font-medium capitalize">{formatMonth(month, "long")}</span>
            <Button variant="outline" size="icon" asChild>
              <Link href={`?mes=${next.slice(0, 7)}`} aria-label="Próximo mês">
                <ChevronRight />
              </Link>
            </Button>
          </div>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">{formatMonth(month, "long")}</CardTitle>
          <CardDescription>Despesas acima do previsto e receitas abaixo da meta aparecem em destaque.</CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetForm
            key={month}
            month={month}
            prevMonth={prev}
            rows={(data ?? []).map((r) => ({ category_id: r.category_id, category_name: r.category_name, type: r.type, budget: Number(r.budget), actual: Number(r.actual) }))}
          />
        </CardContent>
      </Card>
    </>
  );
}
