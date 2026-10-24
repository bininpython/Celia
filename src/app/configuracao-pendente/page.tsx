import { LogoLockup } from "@/components/brand/logo";

export default function SetupPendingPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-lg space-y-4">
        <LogoLockup />
        <h1 className="text-xl font-semibold">Configuração pendente</h1>
        <p className="text-sm text-muted-foreground">
          As variáveis de ambiente do Supabase não foram definidas. Configure <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (veja <code>.env.example</code> e <code>docs/IMPLANTACAO.md</code>) e
          reinicie a aplicação.
        </p>
      </div>
    </main>
  );
}
