"use client";
import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { PaybackChart } from "@/components/charts/projection-chart";
import { simulateScenarios } from "@/lib/finance/investment";
import { formatCurrency, formatPercent } from "@/lib/format";
import { INVESTMENT_KIND_LABELS } from "@/lib/labels";
import type { Enums } from "@/types/database";
import { InvestmentDialog } from "./investment-dialog";

const HINTS: Record<Enums<"investment_kind">, string> = {
  equipamento: "Retorno: novas matrículas atraídas ou retenção. Custo: manutenção e energia.",
  reforma: "Retorno: aumento de capacidade e retenção. Considere meses sem uso durante a obra.",
  publicidade: "Retorno: nº de novos alunos × ticket médio × taxa de permanência.",
  expansao: "Retorno: capacidade adicional × ocupação esperada × ticket médio. Custos fixos sobem.",
  tecnologia: "Retorno: economia de tempo/custos ou receita incremental.",
  outro: "Estime receita adicional e custos recorrentes.",
};

export function InvestmentSimulator({ averageTicket }: { averageTicket: number | null }) {
  const [kind, setKind] = useState<Enums<"investment_kind">>("equipamento");
  const [amount, setAmount] = useState(15000);
  const [newStudents, setNewStudents] = useState(5);
  const [ticket, setTicket] = useState(averageTicket ?? 150);
  const [otherReturn, setOtherReturn] = useState(0);
  const [cost, setCost] = useState(150);
  const [months, setMonths] = useState(24);
  const [rate, setRate] = useState(1);

  const monthlyReturn = newStudents * ticket + otherReturn;
  const scenarios = useMemo(
    () => simulateScenarios({ amount, monthlyReturn, monthlyCost: cost, months, discountRate: rate / 100 }),
    [amount, monthlyReturn, cost, months, rate],
  );
  const base = scenarios[1]!.result;
  const num = (set: (n: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => set(Number(e.target.value) || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulador de investimentos</CardTitle>
        <CardDescription>ROI, payback e valor presente em três cenários.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-1.5">
            <Label htmlFor="sim_kind">Tipo</Label>
            <NativeSelect id="sim_kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              {Object.entries(INVESTMENT_KIND_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sim_amount">Valor do investimento</Label>
            <Input id="sim_amount" type="number" min={0} value={amount} onChange={num(setAmount)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sim_students">Novos alunos/mês atribuídos</Label>
            <Input id="sim_students" type="number" min={0} value={newStudents} onChange={num(setNewStudents)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sim_ticket">Ticket médio mensal</Label>
            <Input id="sim_ticket" type="number" min={0} value={ticket} onChange={num(setTicket)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sim_other">Outras receitas/economia por mês</Label>
            <Input id="sim_other" type="number" min={0} value={otherReturn} onChange={num(setOtherReturn)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sim_cost">Custo mensal adicional</Label>
            <Input id="sim_cost" type="number" min={0} value={cost} onChange={num(setCost)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sim_months">Horizonte (meses)</Label>
            <Input id="sim_months" type="number" min={1} max={120} value={months} onChange={num((n) => setMonths(Math.min(120, Math.max(1, n))))} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sim_rate">Taxa de desconto (% a.m.)</Label>
            <Input id="sim_rate" type="number" min={0} step="0.1" value={rate} onChange={num(setRate)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{HINTS[kind]}</p>

        <div className="grid gap-3 md:grid-cols-3">
          {scenarios.map((s) => (
            <div key={s.key} className={s.key === "base" ? "rounded-lg border-2 border-primary/40 p-4" : "rounded-lg border p-4"}>
              <p className="text-sm font-medium">Cenário {s.label.toLowerCase()}</p>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <dt className="text-muted-foreground">Resultado mensal</dt>
                <dd className="text-right tabular-nums">{formatCurrency(s.result.netMonthly)}</dd>
                <dt className="text-muted-foreground">ROI no horizonte</dt>
                <dd className="text-right tabular-nums">{formatPercent(s.result.roi)}</dd>
                <dt className="text-muted-foreground">Payback</dt>
                <dd className="text-right tabular-nums">{s.result.paybackMonths == null ? "não ocorre" : `${s.result.paybackMonths.toLocaleString("pt-BR")} meses`}</dd>
                <dt className="text-muted-foreground">VPL</dt>
                <dd className="text-right tabular-nums">{formatCurrency(s.result.npv)}</dd>
              </dl>
            </div>
          ))}
        </div>
        <PaybackChart data={base.series} />
        <Alert tone="brand">
          <Info />
          <AlertDescription>
            Estimativa baseada nas premissas informadas — não é garantia de retorno. Cenário pessimista: receita −30% e custos +15%; otimista: receita +25% e
            custos −5%. Valide as premissas com dados reais (ex.: ticket médio atual {averageTicket ? formatCurrency(averageTicket) : "indisponível"}).
          </AlertDescription>
        </Alert>
        <div className="flex justify-end">
          <InvestmentDialog
            preset={{ name: `${INVESTMENT_KIND_LABELS[kind]} (simulação)`, kind, amount, expected_monthly_return: monthlyReturn, expected_monthly_cost: cost, useful_life_months: months }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
