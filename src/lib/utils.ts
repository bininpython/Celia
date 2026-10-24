import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function sum(values: readonly number[]) {
  return round2(values.reduce((acc, v) => acc + v, 0));
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Remove caracteres especiais da sintaxe de filtros do PostgREST. */
export function sanitizeSearch(q: string | undefined | null): string {
  return (q ?? "").replace(/[%,()*\\:"']/g, " ").trim().slice(0, 80);
}
