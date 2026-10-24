"use client";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMonth } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import { axisProps, ChartTable, ChartTooltip, currencyTick, Legend, SERIES } from "./chart-kit";

export function ProjectionChart({ data, height = 260 }: { data: { month: string; balance: number; pessimista: number; otimista: number }[]; height?: number }) {
  const rows = data.map((d) => ({ ...d, label: formatMonth(d.month) }));
  return (
    <div>
      <Legend
        items={[
          { label: "Saldo projetado (base)", color: SERIES.income },
          { label: "Pessimista", color: SERIES.expense, dashed: true },
          { label: "Otimista", color: SERIES.third, dashed: true },
        ]}
      />
      <div style={{ height }} className="mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={SERIES.grid} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} tickFormatter={currencyTick} width={64} />
            <ReferenceLine y={0} stroke="var(--muted-foreground)" />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
            <Line isAnimationActive={false} dataKey="balance" name="Base" stroke={SERIES.income} strokeWidth={2} dot={{ r: 3 }} type="monotone" />
            <Line isAnimationActive={false} dataKey="pessimista" name="Pessimista" stroke={SERIES.expense} strokeWidth={2} strokeDasharray="5 4" dot={false} type="monotone" />
            <Line isAnimationActive={false} dataKey="otimista" name="Otimista" stroke={SERIES.third} strokeWidth={2} strokeDasharray="5 4" dot={false} type="monotone" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ChartTable
        caption="Projeção de saldo de caixa"
        head={["Mês", "Pessimista", "Base", "Otimista"]}
        rows={rows.map((r) => [formatMonth(r.month, "long"), formatCurrency(r.pessimista), formatCurrency(r.balance), formatCurrency(r.otimista)])}
      />
    </div>
  );
}

export function PaybackChart({ data, height = 220 }: { data: { month: number; cumulative: number }[]; height?: number }) {
  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={SERIES.grid} />
            <XAxis dataKey="month" {...axisProps} tickFormatter={(m) => `${m}m`} />
            <YAxis {...axisProps} tickFormatter={currencyTick} width={64} />
            <ReferenceLine y={0} stroke="var(--muted-foreground)" />
            <Tooltip content={<ChartTooltip labelFormatter={(m) => `Mês ${m}`} />} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
            <Line isAnimationActive={false} dataKey="cumulative" name="Resultado acumulado" stroke={SERIES.income} strokeWidth={2} dot={false} type="monotone" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ChartTable caption="Resultado acumulado do investimento" head={["Mês", "Acumulado"]} rows={data.map((d) => [d.month, formatCurrency(d.cumulative)])} />
    </div>
  );
}
