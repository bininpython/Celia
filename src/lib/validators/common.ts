import { z } from "zod";

/** Texto opcional: string vazia vira null. */
export const optionalText = (max = 500) =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v ?? null),
    z.string().max(max, `Máximo de ${max} caracteres`).nullable(),
  );

export const requiredText = (label: string, max = 200) =>
  z.string({ error: `${label} é obrigatório` }).trim().min(1, `${label} é obrigatório`).max(max, `Máximo de ${max} caracteres`);

const toNumber = (v: unknown) => {
  if (v === "" || v === null || v === undefined) return undefined;
  if (typeof v === "number") return Number.isNaN(v) ? undefined : v;
  if (typeof v === "string") {
    const t = v.trim();
    // "1.234,56" (formato brasileiro) ou "1234.56" (input numérico)
    const n = t.includes(",") ? Number(t.replace(/\./g, "").replace(",", ".")) : Number(t);
    return Number.isNaN(n) ? v : n;
  }
  return v;
};

/** Número (aceita "1.234,56"). */
export const money = (label = "Valor") =>
  z.preprocess(
    (v) => toNumber(v) ?? 0,
    z.number({ error: `${label} inválido` }).min(0, `${label} não pode ser negativo`).max(10_000_000),
  );

export const positiveMoney = (label = "Valor") =>
  z.preprocess(toNumber, z.number({ error: `${label} inválido` }).positive(`${label} deve ser maior que zero`).max(10_000_000));

export const optionalNumber = (min = 0, max = 1_000_000) =>
  z.preprocess((v) => toNumber(v) ?? null, z.number({ error: "Número inválido" }).min(min).max(max).nullable());

export const intRange = (label: string, min: number, max: number) =>
  z.preprocess(toNumber, z.number({ error: `${label} inválido` }).int(`${label} deve ser inteiro`).min(min).max(max));

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const isoDate = (label = "Data") =>
  z.string({ error: `${label} é obrigatória` }).regex(ISO_DATE, `${label} inválida`);
export const optionalDate = () =>
  z.preprocess((v) => (v === "" || v === undefined ? null : v), z.string().regex(ISO_DATE, "Data inválida").nullable());

export const uuid = (label = "Registro") => z.uuid({ error: `${label} inválido` });
export const optionalUuid = () => z.preprocess((v) => (v === "" || v === undefined ? null : v), z.uuid().nullable());

export const optionalEmail = () =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v ?? null), z.email("E-mail inválido").nullable());

/** Valida CPF pelos dígitos verificadores. */
export function isValidCpf(value: string): boolean {
  const d = value.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (len: number) => {
    let s = 0;
    for (let i = 0; i < len; i++) s += Number(d[i]) * (len + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

export const optionalCpf = () =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.replace(/\D/g, "") === "" ? null : v.replace(/\D/g, "")) : v ?? null),
    z.string().refine(isValidCpf, "CPF inválido").nullable(),
  );

export const optionalPhone = () =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.replace(/\D/g, "") === "" ? null : v.replace(/\D/g, "")) : v ?? null),
    z.string().min(10, "Telefone inválido").max(13, "Telefone inválido").nullable(),
  );

export const checkbox = () => z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean());
