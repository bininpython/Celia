"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { copyBudget, saveBudgets } from "../actions";

type Row = { category_id: string; category_name: string; type: "receita" | "despesa"; budget: number; actual: number };

export function BudgetForm({ month, prevMonth, rows }: { month: string; prevMonth: string; rows: Row[] }) {
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(rows.map((r) => [r.category_id, r.budget ? String(r.budget) : ""])));
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message);
      router.refresh();
    });

  const section = (type: "receita" | "despesa") => {
    const list = rows.filter((r) => r.type === type);
    const tb = list.reduce((a, r) => a + Number(values[r.category_id] || 0), 0);
    const ta = list.reduce((a, r) => a + r.actual, 0);
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground uppercase">
              <th className="py-2 text-left font-medium">{type === "receita" ? "Receitas" : "Despesas"}</th>
              <th className="w-40 py-2 text-right font-medium">Previsto</th>
              <th className="py-2 text-right font-medium">Realizado</th>
              <th className="py-2 text-right font-medium">Diferença</th>
              <th className="py-2 pr-2 text-right font-medium">% exec.</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const b = Number(values[r.category_id] || 0);
              const diff = r.actual - b;
              const bad = type === "despesa" ? diff > 0.009 : diff < -0.009;
              return (
                <tr key={r.category_id} className="border-b">
                  <td className="py-1.5">{r.category_name}</td>
                  <td className="py-1.5">
                    <Input
                      aria-label={`Previsto para ${r.category_name}`}
                      type="number"
                      step="0.01"
                      min={0}
                      className="h-8 text-right"
                      value={values[r.category_id] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [r.category_id]: e.target.value }))}
                    />
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{formatCurrency(r.actual)}</td>
                  <td className={cn("py-1.5 text-right tabular-nums", b > 0 && bad && "text-destructive")}>{b > 0 ? formatCurrency(diff) : "—"}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{b > 0 ? formatPercent(r.actual / b) : "—"}</td>
                </tr>
              );
            })}
            <tr className="bg-muted/50 font-medium">
              <td className="py-2 pl-1">Total</td>
              <td className="py-2 text-right tabular-nums">{formatCurrency(tb)}</td>
              <td className="py-2 text-right tabular-nums">{formatCurrency(ta)}</td>
              <td className="py-2 text-right tabular-nums">{formatCurrency(ta - tb)}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{tb > 0 ? formatPercent(ta / tb) : "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {section("receita")}
      {section("despesa")}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" disabled={pending} onClick={() => run(() => copyBudget({ from: prevMonth, to: month }))}>
          <Copy /> Copiar do mês anterior
        </Button>
        <Button
          disabled={pending}
          onClick={() =>
            run(() =>
              saveBudgets({
                items: rows.map((r) => ({ category_id: r.category_id, month, amount: values[r.category_id] || 0 })),
              }),
            )
          }
        >
          {pending && <Loader2 className="animate-spin" />} Salvar orçamento
        </Button>
      </div>
    </div>
  );
}
