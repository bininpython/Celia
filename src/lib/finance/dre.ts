import { round2 } from "@/lib/utils";

export type CategoryTotal = {
  category_name: string;
  type: "receita" | "despesa";
  dre_group: string;
  total: number;
};

export type DreLine = {
  key: string;
  label: string;
  value: number;
  kind: "group" | "subtotal" | "total" | "detail";
  details?: { label: string; value: number }[];
};

const group = (rows: CategoryTotal[], g: string) => rows.filter((r) => r.dre_group === g);
const total = (rows: CategoryTotal[]) => round2(rows.reduce((a, r) => a + Number(r.total), 0));
const details = (rows: CategoryTotal[]) => rows.map((r) => ({ label: r.category_name, value: round2(Number(r.total)) }));

/** DRE gerencial simplificado a partir dos totais por categoria. */
export function buildDre(rows: CategoryTotal[]) {
  const receitaOp = group(rows, "receita_operacional");
  const outras = group(rows, "outras_receitas");
  const impostos = group(rows, "impostos");
  const variaveis = group(rows, "custo_variavel");
  const fixas = group(rows, "despesa_fixa");
  const invest = group(rows, "investimento");

  const receitaBruta = round2(total(receitaOp) + total(outras));
  const receitaLiquida = round2(receitaBruta - total(impostos));
  const margem = round2(receitaLiquida - total(variaveis));
  const operacional = round2(margem - total(fixas));
  const final = round2(operacional - total(invest));

  const lines: DreLine[] = [
    { key: "rec_op", label: "Receita operacional", value: total(receitaOp), kind: "group", details: details(receitaOp) },
    { key: "rec_out", label: "Outras receitas", value: total(outras), kind: "group", details: details(outras) },
    { key: "rec_bruta", label: "Receita bruta", value: receitaBruta, kind: "subtotal" },
    { key: "impostos", label: "(−) Impostos", value: -total(impostos), kind: "group", details: details(impostos) },
    { key: "rec_liq", label: "Receita líquida", value: receitaLiquida, kind: "subtotal" },
    { key: "variaveis", label: "(−) Custos variáveis", value: -total(variaveis), kind: "group", details: details(variaveis) },
    { key: "margem", label: "Margem de contribuição", value: margem, kind: "subtotal" },
    { key: "fixas", label: "(−) Despesas fixas", value: -total(fixas), kind: "group", details: details(fixas) },
    { key: "operacional", label: "Resultado operacional", value: operacional, kind: "subtotal" },
    { key: "invest", label: "(−) Investimentos", value: -total(invest), kind: "group", details: details(invest) },
    { key: "final", label: "Resultado líquido do período", value: final, kind: "total" },
  ];

  return {
    lines,
    receitaBruta,
    receitaLiquida,
    margem,
    margemPercent: receitaLiquida > 0 ? margem / receitaLiquida : null,
    operacional,
    final,
    finalPercent: receitaBruta > 0 ? final / receitaBruta : null,
  };
}
