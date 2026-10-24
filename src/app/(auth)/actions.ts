"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentials = z.object({
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(6, "Informe a senha"),
  next: z.string().optional(),
});

export type AuthState = { error?: string; message?: string };

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) {
    return { error: error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message };
  }
  const next = parsed.data.next;
  redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = z.email().safeParse(formData.get("email"));
  if (!email.success) return { error: "Informe um e-mail válido." };
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${origin}/auth/callback?next=/auth/nova-senha`,
  });
  if (error) return { error: "Não foi possível enviar o e-mail agora. Tente novamente em instantes." };
  // Resposta neutra: não revela se o e-mail está cadastrado.
  return { message: "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha." };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const schema = z
    .object({ password: z.string().min(8, "A senha deve ter ao menos 8 caracteres").max(72), confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "As senhas não conferem" });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Link expirado. Solicite uma nova redefinição de senha." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };
  return { message: "Senha atualizada com sucesso." };
}
