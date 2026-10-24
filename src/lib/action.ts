import "server-only";
import { z } from "zod";
import { getSessionUser, type SessionUser } from "@/lib/auth";
import { canAccess, type Module } from "@/lib/permissions";

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export const ok = <T>(data: T, message?: string): ActionResult<T> => ({ ok: true, data, message });
export const fail = (error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> => ({
  ok: false,
  error,
  fieldErrors,
});

/** Traduz erros comuns do PostgreSQL/PostgREST para mensagens amigáveis. */
export function dbError(error: { message: string; code?: string; details?: string | null }): ActionResult<never> {
  switch (error.code) {
    case "23505":
      return fail("Registro duplicado: já existe um cadastro com estes dados.");
    case "23503":
      return fail("Não é possível concluir: existem registros vinculados.");
    case "23514":
      return fail("Valores inválidos para esta operação.");
    case "42501":
      return fail(error.message.includes("row-level security") ? "Você não tem permissão para esta operação." : error.message);
    case "P0001":
      return fail(error.message);
    default:
      console.error("[db]", error);
      return fail(error.message || "Erro inesperado ao acessar o banco de dados.");
  }
}

/**
 * Envolve uma Server Action: autentica, verifica o módulo, valida a entrada
 * com Zod no servidor e captura exceções.
 */
export function action<S extends z.ZodType, R>(
  module: Module,
  schema: S,
  handler: (input: z.output<S>, user: SessionUser) => Promise<ActionResult<R>>,
) {
  return async (raw: z.input<S>): Promise<ActionResult<R>> => {
    const user = await getSessionUser();
    if (!user) return fail("Sessão expirada. Entre novamente.");
    if (!canAccess(user.role, module)) return fail("Você não tem permissão para esta operação.");
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const flat = z.flattenError(parsed.error);
      return fail("Verifique os campos destacados.", flat.fieldErrors as Record<string, string[]>);
    }
    try {
      return await handler(parsed.data, user);
    } catch (e) {
      console.error("[action]", e);
      return fail(e instanceof Error ? e.message : "Erro inesperado.");
    }
  };
}
