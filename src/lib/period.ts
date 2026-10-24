import { addMonths, endOfMonth, startOfMonth, startOfYear, todayISO } from "@/lib/dates";
import type { PeriodPreset } from "@/components/shared/url-filters";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function periodPresets(today = todayISO()): PeriodPreset[] {
  const som = startOfMonth(today);
  return [
    { label: "Este mês", from: som, to: endOfMonth(today) },
    { label: "Mês anterior", from: addMonths(som, -1), to: endOfMonth(addMonths(som, -1)) },
    { label: "Últimos 3 meses", from: addMonths(som, -2), to: endOfMonth(today) },
    { label: "Últimos 6 meses", from: addMonths(som, -5), to: endOfMonth(today) },
    { label: "Últimos 12 meses", from: addMonths(som, -11), to: endOfMonth(today) },
    { label: "Este ano", from: startOfYear(today), to: `${today.slice(0, 4)}-12-31` },
  ];
}

/** Lê ?de=&ate= da URL com fallback para o mês corrente. */
export function readPeriod(sp: Record<string, string | string[] | undefined>, fallback: "mes" | "6meses" | "12meses" = "mes") {
  const today = todayISO();
  const de = typeof sp.de === "string" && ISO.test(sp.de) ? sp.de : null;
  const ate = typeof sp.ate === "string" && ISO.test(sp.ate) ? sp.ate : null;
  if (de && ate && de <= ate) return { from: de, to: ate };
  const som = startOfMonth(today);
  if (fallback === "6meses") return { from: addMonths(som, -5), to: endOfMonth(today) };
  if (fallback === "12meses") return { from: addMonths(som, -11), to: endOfMonth(today) };
  return { from: som, to: endOfMonth(today) };
}

export function readString(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = sp[key];
  return typeof v === "string" && v.length > 0 ? v.slice(0, 120) : undefined;
}

export function readPage(sp: Record<string, string | string[] | undefined>): number {
  const n = Number(sp.pagina);
  return Number.isInteger(n) && n > 0 ? n : 1;
}
