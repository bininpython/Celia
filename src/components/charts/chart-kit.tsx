"use client";
import type { ReactNode } from "react";
import { formatCurrency, formatCurrencyCompact, formatNumber } from "@/lib/format";

/** Paleta validada (CVD) — receita, despesa, terceira série. Ver docs/IDENTIDADE_VISUAL.md */
export const SERIES = {
  income: "var(--chart-income)",
  expense: "var(--chart-expense)",
  third: "var(--chart-third)",
  muted: "var(--chart-muted)",
  grid: "var(--chart-grid)",
} as const;

export const axisProps = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

export const currencyTick = (v: number) => formatCurrencyCompact(v);

type TooltipEntry = { name?: string | number; value?: number | string; color?: string; dataKey?: string | number };

export function ChartTooltip({
  active,
  payload,
  label,
  format = "currency",
  labelFormatter,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  format?: "currency" | "number";
  labelFormatter?: (l: string | number) => string;
}) {
  if (!active || !payload?.length) return null;
  const fmt = format === "currency" ? formatCurrency : formatNumber;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      {label !== undefined && <p className="mb-1 font-medium text-foreground">{labelFormatter ? labelFormatter(label) : label}</p>}
      <ul className="space-y-0.5">
        {payload.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center gap-2 text-muted-foreground">
            <span className="size-2 rounded-full" style={{ background: p.color }} aria-hidden />
            <span>{p.name}</span>
            <span className="ml-auto pl-3 font-medium text-foreground tabular-nums">{fmt(Number(p.value ?? 0))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-3 rounded-sm"
            style={i.dashed ? { borderTop: `2px dashed ${i.color}`, height: 0 } : { background: i.color }}
            aria-hidden
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Tabela acessível equivalente ao gráfico (leitores de tela / impressão). */
export function ChartTable({ caption, head, rows }: { caption: string; head: string[]; rows: ReactNode[][] }) {
  return (
    <details className="mt-3 text-xs">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver dados em tabela</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              {head.map((h) => (
                <th key={h} className="py-1 pr-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                {r.map((c, j) => (
                  <td key={j} className="py-1 pr-3 tabular-nums">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
