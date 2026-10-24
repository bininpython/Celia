import { Eye } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { isDemoMode } from "@/lib/env";

/** Faixa informativa exibida no modo demonstração. */
export function DemoBanner() {
  if (!isDemoMode()) return null;
  return (
    <div className="no-print flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-foreground px-4 py-1.5 text-center text-xs text-background">
      <span className="inline-flex items-center gap-1.5">
        <Eye className="size-3.5" /> Modo visitação — dados fictícios, nenhuma alteração é salva.
      </span>
      <form action={signOut}>
        <button type="submit" className="cursor-pointer font-medium text-primary underline-offset-2 hover:underline">
          Trocar de perfil
        </button>
      </form>
    </div>
  );
}
