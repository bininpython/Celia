import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ message: "NEXT_PUBLIC_SUPABASE_URL ausente ou inválida" }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, "NEXT_PUBLIC_SUPABASE_ANON_KEY ausente"),
});

export function publicEnv() {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    throw new Error(`Configuração inválida: ${parsed.error.issues.map((i) => i.message).join("; ")}. Veja .env.example.`);
  }
  return parsed.data;
}

export function isSupabaseConfigured() {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

/** Variáveis exclusivas do servidor. */
export function serverSecret(name: "SUPABASE_SERVICE_ROLE_KEY" | "CHECKIN_TOKEN_SECRET"): string {
  const value = process.env[name];
  if (!value || value.length < 20) {
    throw new Error(`Variável de ambiente ${name} não configurada. Veja .env.example.`);
  }
  return value;
}
