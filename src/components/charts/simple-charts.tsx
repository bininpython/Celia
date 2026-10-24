"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency, formatNumber } from "@/lib/format";
import { axisProps, ChartTable, ChartTooltip, currencyTick, SERIES } from "./chart-kit";

type Point = { label: string; value: number };

/** Série única ao longo do tempo (área). Título do card nomeia a série. */
export function TrendArea({
  data,
  name,
  format = "currency",
  height = 220,
  color = SERIES.income,
}: {
  data: Point[];
  name: string;
  format?: "currency" | "number";
  height?: number;
  color?: string;
}) {
  const id = `g-${name.replace(/\W/g, "")}`;
  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={SERIES.grid} />
            <XAxis dataKey="label" {...axisProps} minTickGap={16} />
            <YAxis {...axisProps} width={format === "currency" ? 64 : 36} tickFormatter={format === "currency" ? currencyTick : (v) => formatNumber(v)} allowDecimals={false} />
            <Tooltip content={<ChartTooltip format={format} />} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
            <Area type="monotone" dataKey="value" name={name} stroke={color} strokeWidth={2} fill={`url(#${id})`} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <ChartTable
        caption={name}
        head={["Período", name]}
        rows={data.map((d) => [d.label, format === "currency" ? formatCurrency(d.value) : formatNumber(d.value)])}
      />
    </div>
  );
}

/** Barras horizontais de magnitude (ranking por categoria) — uma cor. */
export function RankBars({ data, format = "currency", color = SERIES.expense }: { data: Point[]; format?: "currency" | "number"; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const fmt = format === "currency" ? formatCurrency : formatNumber;
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label} className="text-sm">
          <div className="mb-1 flex justify-between gap-3">
            <span className="truncate">{d.label}</span>
            <span className="font-medium tabular-nums">{fmt(d.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Colunas simples (uma série). */
export function SimpleBars({ data, name, format = "number", height = 220, color = SERIES.income }: { data: Point[]; name: string; format?: "currency" | "number"; height?: number; color?: string }) {
  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="24%">
            <CartesianGrid vertical={false} stroke={SERIES.grid} />
            <XAxis dataKey="label" {...axisProps} minTickGap={8} />
            <YAxis {...axisProps} width={format === "currency" ? 64 : 32} allowDecimals={false} tickFormatter={format === "currency" ? currencyTick : undefined} />
            <Tooltip content={<ChartTooltip format={format} />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
            <Bar dataKey="value" name={name} fill={color} radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartTable caption={name} head={["Período", name]} rows={data.map((d) => [d.label, format === "currency" ? formatCurrency(d.value) : formatNumber(d.value)])} />
    </div>
  );
}

/** Linha de progressão de carga (kg) por data. */
export function ProgressLine({ data, height = 200 }: { data: Point[]; height?: number }) {
  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={SERIES.grid} />
            <XAxis dataKey="label" {...axisProps} minTickGap={16} />
            <YAxis {...axisProps} width={40} unit=" kg" />
            <Tooltip content={<ChartTooltip format="number" />} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
            <Line type="monotone" dataKey="value" name="Carga (kg)" stroke={SERIES.income} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ChartTable caption="Progressão de carga" head={["Data", "Carga (kg)"]} rows={data.map((d) => [d.label, formatNumber(d.value)])} />
    </div>
  );
}
