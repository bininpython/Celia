"use client";
import { Bar, BarChart, CartesianGrid, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMonth } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import { axisProps, ChartTable, ChartTooltip, currencyTick, Legend, SERIES } from "./chart-kit";

export type IncomeExpensePoint = { month: string; income: number; expense: number };

/** Receitas x despesas por mês (barras agrupadas) + resultado (linha). */
export function IncomeExpenseChart({ data, height = 280, showResult = true }: { data: IncomeExpensePoint[]; height?: number; showResult?: boolean }) {
  const rows = data.map((d) => ({ ...d, result: d.income - d.expense, label: formatMonth(d.month) }));
  return (
    <div>
      <Legend
        items={[
          { label: "Receitas", color: SERIES.income },
          { label: "Despesas", color: SERIES.expense },
          ...(showResult ? [{ label: "Resultado", color: SERIES.third, dashed: true }] : []),
        ]}
      />
      <div style={{ height }} className="mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke={SERIES.grid} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} tickFormatter={currencyTick} width={64} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
            <Bar isAnimationActive={false} dataKey="income" name="Receitas" fill={SERIES.income} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar isAnimationActive={false} dataKey="expense" name="Despesas" fill={SERIES.expense} radius={[4, 4, 0, 0]} maxBarSize={28} />
            {showResult && (
              <Line isAnimationActive={false} dataKey="result" name="Resultado" stroke={SERIES.third} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} type="monotone" />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ChartTable
        caption="Receitas e despesas por mês"
        head={["Mês", "Receitas", "Despesas", "Resultado"]}
        rows={rows.map((r) => [formatMonth(r.month, "long"), formatCurrency(r.income), formatCurrency(r.expense), formatCurrency(r.result)])}
      />
    </div>
  );
}

/** Comparativo ano atual x ano anterior (mesmo mês). */
export function YearComparisonChart({ data, height = 240 }: { data: { label: string; current: number; previous: number }[]; height?: number }) {
  return (
    <div>
      <Legend items={[{ label: "Ano atual", color: SERIES.income }, { label: "Ano anterior", color: SERIES.expense }]} />
      <div style={{ height }} className="mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke={SERIES.grid} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} tickFormatter={currencyTick} width={64} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
            <Bar isAnimationActive={false} dataKey="current" name="Ano atual" fill={SERIES.income} radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Bar isAnimationActive={false} dataKey="previous" name="Ano anterior" fill={SERIES.expense} radius={[4, 4, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartTable
        caption="Receita: ano atual x anterior"
        head={["Mês", "Ano atual", "Ano anterior"]}
        rows={data.map((d) => [d.label, formatCurrency(d.current), formatCurrency(d.previous)])}
      />
    </div>
  );
}
