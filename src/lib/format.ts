const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
const num = new Intl.NumberFormat("pt-BR");
const pct = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });

export const formatCurrency = (v: number | null | undefined) => brl.format(v ?? 0);
export const formatCurrencyCompact = (v: number | null | undefined) => brlCompact.format(v ?? 0);
export const formatNumber = (v: number | null | undefined) => num.format(v ?? 0);
/** Recebe fração (0.125 => 12,5%). */
export const formatPercent = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? "—" : pct.format(v));

export function formatPhone(v: string | null | undefined) {
  if (!v) return "—";
  const d = v.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v;
}

export function formatCpf(v: string | null | undefined) {
  if (!v) return "—";
  const d = v.replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : v;
}

/** Mascara CPF para exibição em listagens (LGPD: minimização). */
export function maskCpf(v: string | null | undefined) {
  if (!v) return "—";
  const d = v.replace(/\D/g, "");
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : "***";
}
