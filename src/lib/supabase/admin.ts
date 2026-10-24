import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverSecret } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente com service role — IGNORA RLS. Use somente em Server Actions,
 * depois de verificar a permissão do usuário, e apenas para operações de
 * administração de contas (Supabase Auth Admin API).
 */
export function createAdminClient() {
  return createClient<Database>(publicEnv().NEXT_PUBLIC_SUPABASE_URL, serverSecret("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
