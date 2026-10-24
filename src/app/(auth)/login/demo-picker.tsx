import { ArrowRight, Eye } from "lucide-react";
import { LogoLockup } from "@/components/brand/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DEMO_ROLES } from "@/lib/demo/session";
import { enterDemo } from "../actions";

/** Tela de entrada do modo demonstração: escolha do perfil para visitar o sistema. */
export function DemoPicker() {
  return (
    <div className="w-full max-w-md space-y-6">
      <LogoLockup className="lg:hidden" />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Modo visitação</h1>
        <p className="text-sm text-muted-foreground">Escolha um perfil para conhecer as funcionalidades do sistema.</p>
      </div>
      <Alert tone="brand">
        <Eye />
        <AlertDescription>Os dados exibidos são fictícios e nenhuma alteração é salva.</AlertDescription>
      </Alert>
      <form action={enterDemo} className="grid gap-2">
        {DEMO_ROLES.map((r) => (
          <button
            key={r.role}
            type="submit"
            name="role"
            value={r.role}
            className="group flex w-full cursor-pointer items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <span className="flex-1">
              <span className="block font-medium">{r.label}</span>
              <span className="block text-xs text-muted-foreground">{r.description}</span>
            </span>
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </button>
        ))}
      </form>
    </div>
  );
}
