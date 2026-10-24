import { round2 } from "@/lib/utils";

export type CashEntry = { id: string; date: string; type: "receita" | "despesa"; amount: number; description: string };

/** Livro-caixa: ordena por data e calcula o saldo acumulado. */
export function buildCashbook(opening: number, entries: CashEntry[]) {
  const sorted = [...entries].sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)));
  let balance = opening;
  return sorted.map((e) => {
    balance = round2(balance + (e.type === "receita" ? e.amount : -e.amount));
    return { ...e, balance };
  });
}
