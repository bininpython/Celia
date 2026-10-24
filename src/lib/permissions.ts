import type { Enums } from "@/types/database";

export type Role = Enums<"app_role">;

/**
 * Matriz de acesso por módulo. Espelha as políticas RLS do banco
 * (supabase/migrations/*_rls.sql) — o banco é a barreira definitiva;
 * esta matriz controla navegação e exibição.
 */
export const MODULE_ROLES = {
  dashboard: ["admin", "gerente", "recepcionista", "professor"],
  alunos: ["admin", "gerente", "recepcionista", "professor"],
  alunos_editar: ["admin", "gerente", "recepcionista"],
  alunos_excluir: ["admin"],
  saude: ["admin", "gerente", "professor"],
  planos: ["admin", "gerente", "recepcionista"],
  planos_editar: ["admin", "gerente"],
  mensalidades: ["admin", "gerente", "recepcionista"],
  renegociar: ["admin", "gerente"],
  estornar: ["admin", "gerente"],
  treinos: ["admin", "gerente", "professor"],
  exercicios: ["admin", "gerente", "professor"],
  frequencia: ["admin", "gerente", "recepcionista", "professor"],
  financeiro: ["admin", "gerente"],
  investimentos: ["admin", "gerente"],
  analises: ["admin", "gerente"],
  agenda: ["admin", "gerente", "recepcionista", "professor"],
  relatorios: ["admin", "gerente"],
  funcionarios: ["admin", "gerente"],
  auditoria: ["admin", "gerente"],
  configuracoes: ["admin"],
  notificacoes: ["admin", "gerente", "recepcionista", "professor"],
  portal: ["aluno"],
} as const satisfies Record<string, readonly Role[]>;

export type Module = keyof typeof MODULE_ROLES;

export function canAccess(role: Role | null | undefined, module: Module): boolean {
  if (!role) return false;
  return (MODULE_ROLES[module] as readonly Role[]).includes(role);
}

export function isStaffRole(role: Role | null | undefined): boolean {
  return !!role && role !== "aluno";
}

/** Página inicial após login conforme o papel. */
export function homeFor(role: Role): string {
  return role === "aluno" ? "/portal" : role === "professor" ? "/treinos" : "/dashboard";
}
