import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireModule } from "@/lib/auth";
import { addMonths, startOfMonth, todayISO } from "@/lib/dates";
import { monthlyEquivalent } from "@/lib/finance/invoice";
import { formatCurrency, formatNumber } from "@/lib/format";
import { PERIODICITY_LABELS } from "@/lib/labels";
import { canAccess } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PlanDialog, PlanToggle } from "./plan-dialog";

export const metadata: Metadata = { title: "Planos" };

export default async function PlansPage() {
  const user = await requireModule("planos");
  const canEdit = canAccess(user.role, "planos_editar");
  const supabase = await createClient();
  const today = todayISO();
  const [{ data: plans }, { data: stats }] = await Promise.all([
    supabase.from("plans").select("*").order("active", { ascending: false }).order("duration_months"),
    supabase.rpc("plan_stats", { p_from: addMonths(startOfMonth(today), -11), p_to: today }),
  ]);
  const statOf = (id: string) => stats?.find((s) => s.plan_id === id);
  const zeroPrice = (plans ?? []).some((p) => p.active && Number(p.price) === 0);

  return (
    <>
      <PageHeader title="Planos" description="Planos mensais, trimestrais, semestrais, anuais e personalizados." actions={canEdit && <PlanDialog />} />
      {zeroPrice && (
        <Alert tone="warning">
          <AlertDescription>Há planos ativos com preço R$ 0,00. Defina os valores antes de matricular alunos.</AlertDescription>
        </Alert>
      )}
      <Card className="py-0">
        <CardContent className="px-0">
          {!plans?.length ? (
            <div className="p-6">
              <EmptyState icon={ClipboardList} title="Nenhum plano cadastrado" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plano</TableHead>
                  <TableHead>Periodicidade</TableHead>
                  <TableHead className="text-right">Preço do ciclo</TableHead>
                  <TableHead className="text-right">Equivalente mensal</TableHead>
                  <TableHead className="text-right">Matrículas ativas</TableHead>
                  <TableHead className="text-right">Receita recorrente</TableHead>
                  <TableHead className="text-right">Recebido (12m)</TableHead>
                  {canEdit && <TableHead className="text-right">Ativo</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => {
                  const st = statOf(p.id);
                  return (
                    <TableRow key={p.id} className={p.active ? undefined : "text-muted-foreground"}>
                      <TableCell>
                        <span className="font-medium">{p.name}</span>
                        {p.description && <span className="block max-w-xs truncate text-xs text-muted-foreground">{p.description}</span>}
                      </TableCell>
                      <TableCell>
                        {PERIODICITY_LABELS[p.periodicity]} · {p.duration_months} {p.duration_months === 1 ? "mês" : "meses"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(Number(p.price))}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(monthlyEquivalent(Number(p.price), 0, p.duration_months))}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(Number(st?.active_memberships ?? 0))}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(Number(st?.monthly_recurring ?? 0))}/mês</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(Number(st?.received ?? 0))}</TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <PlanDialog
                              plan={{
                                id: p.id,
                                name: p.name,
                                periodicity: p.periodicity,
                                duration_months: p.duration_months,
                                price: Number(p.price),
                                weekly_frequency: p.weekly_frequency ?? "",
                                description: p.description ?? "",
                                active: p.active,
                              }}
                            />
                            <PlanToggle id={p.id} active={p.active} name={p.name} />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
