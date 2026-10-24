import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccess, homeFor, type Module, type Role } from "@/lib/permissions";

export type SessionUser = {
  id: string;
  email: string | null;
  fullName: string;
  role: Role;
  gymId: string;
  gymName: string;
  studentId: string | null;
};

/** Data Access Layer: usuário autenticado + perfil (memoizado por requisição). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, gym_id, active, gyms(name)")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!profile || !profile.active) return null;

  let studentId: string | null = null;
  if (profile.role === "aluno") {
    const { data: student } = await supabase.from("students").select("id").eq("user_id", auth.user.id).maybeSingle();
    studentId = student?.id ?? null;
  }

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
    gymId: profile.gym_id,
    gymName: profile.gyms?.name ?? "Studio Personal Célia Barbosa",
    studentId,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Exige acesso ao módulo; redireciona para a página inicial do papel caso contrário. */
export async function requireModule(module: Module): Promise<SessionUser> {
  const user = await requireUser();
  if (!canAccess(user.role, module)) redirect(homeFor(user.role));
  return user;
}
