import type { Role } from "@/lib/permissions";

export const DEMO_ROLES: { role: Role; label: string; description: string }[] = [
  { role: "admin", label: "Administradora", description: "Acesso completo: financeiro, equipe, configurações." },
  { role: "gerente", label: "Gerente", description: "Operação e financeiro." },
  { role: "recepcionista", label: "Recepção", description: "Alunos, mensalidades, check-in e agenda." },
  { role: "professor", label: "Professor", description: "Fichas de treino, exercícios e frequência." },
  { role: "aluno", label: "Aluno (portal)", description: "Treinos, mensalidades e QR Code de check-in." },
];

export function readDemoRole(value: string | undefined): Role | null {
  return DEMO_ROLES.some((r) => r.role === value) ? (value as Role) : null;
}
