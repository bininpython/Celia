/**
 * Utilitários de data. Datas "puras" (YYYY-MM-DD) são tratadas como strings
 * para evitar deslocamentos de fuso; o fuso de referência é o da academia.
 */
export const GYM_TIMEZONE = "America/Sao_Paulo";

const pad = (n: number) => String(n).padStart(2, "0");

/** Data de hoje (YYYY-MM-DD) no fuso da academia. */
export function todayISO(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: GYM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts; // en-CA => YYYY-MM-DD
}

export function parseISODate(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) throw new Error(`Data inválida: ${iso}`);
  return { y, m, d };
}

export function toISODate(y: number, m: number, d: number): string {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function addDays(iso: string, days: number): string {
  const { y, m, d } = parseISODate(iso);
  return toISODate(y, m, d + days);
}

/** Soma meses mantendo o dia (limitado ao último dia do mês). */
export function addMonths(iso: string, months: number): string {
  const { y, m, d } = parseISODate(iso);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return toISODate(target.getUTCFullYear(), target.getUTCMonth() + 1, Math.min(d, last));
}

export function startOfMonth(iso: string): string {
  const { y, m } = parseISODate(iso);
  return toISODate(y, m, 1);
}

export function endOfMonth(iso: string): string {
  const { y, m } = parseISODate(iso);
  return toISODate(y, m + 1, 0);
}

export function startOfYear(iso: string): string {
  return `${iso.slice(0, 4)}-01-01`;
}

/** Diferença em dias entre duas datas ISO (b - a). */
export function diffDays(a: string, b: string): number {
  const pa = parseISODate(a);
  const pb = parseISODate(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86_400_000);
}

export function monthsBetween(a: string, b: string): number {
  const pa = parseISODate(a);
  const pb = parseISODate(b);
  return (pb.y - pa.y) * 12 + (pb.m - pa.m);
}

/** Lista de competências (primeiro dia do mês) entre duas datas, inclusive. */
export function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = startOfMonth(from);
  const end = startOfMonth(to);
  while (cur <= end) {
    out.push(cur);
    cur = addMonths(cur, 1);
  }
  return out;
}

export function ageFrom(birthISO: string, today = todayISO()): number {
  const b = parseISODate(birthISO);
  const t = parseISODate(today);
  let age = t.y - b.y;
  if (t.m < b.m || (t.m === b.m && t.d < b.d)) age--;
  return age;
}

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS_LONG = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.length === 10) {
    const { y, m, d } = parseISODate(value);
    return `${pad(d)}/${pad(m)}/${y}`;
  }
  return new Intl.DateTimeFormat("pt-BR", { timeZone: GYM_TIMEZONE, dateStyle: "short" }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: GYM_TIMEZONE,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: GYM_TIMEZONE, timeStyle: "short" }).format(new Date(value));
}

export function formatMonth(iso: string, style: "short" | "long" = "short"): string {
  const { y, m } = parseISODate(iso);
  return style === "short" ? `${MONTHS_SHORT[m - 1]}/${String(y).slice(2)}` : `${MONTHS_LONG[m - 1]} de ${y}`;
}

/** Converte um timestamp para a data (YYYY-MM-DD) no fuso da academia. */
export function isoDateInGymTz(timestamp: string | Date): string {
  return todayISO(typeof timestamp === "string" ? new Date(timestamp) : timestamp);
}

/** Converte "YYYY-MM-DDTHH:mm" (input datetime-local, horário da academia) para ISO UTC. */
export function localDateTimeToISO(local: string): string {
  const [date, time = "00:00"] = local.split("T");
  const { y, m, d } = parseISODate(date!);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh ?? 0, mm ?? 0);
  // Descobre o deslocamento do fuso naquele instante
  const asTz = new Date(new Date(guess).toLocaleString("en-US", { timeZone: GYM_TIMEZONE }));
  const asUtc = new Date(new Date(guess).toLocaleString("en-US", { timeZone: "UTC" }));
  const offset = asUtc.getTime() - asTz.getTime();
  return new Date(guess + offset).toISOString();
}

/** Converte ISO UTC para "YYYY-MM-DDTHH:mm" no horário da academia. */
export function isoToLocalDateTime(iso: string): string {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: GYM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
