import { LogoSymbol } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-white lg:flex">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.09]"
          style={{
            backgroundImage: "url(/brand/simbolo.svg)",
            backgroundSize: "88px 92px",
            backgroundRepeat: "repeat",
          }}
        />
        <div className="relative flex items-center gap-3">
          <LogoSymbol className="size-9" />
        </div>
        <div className="relative space-y-3">
          <p className="text-sm font-medium tracking-[0.25em] uppercase opacity-90">Studio Personal</p>
          <p className="text-5xl font-semibold tracking-tight">Célia Barbosa</p>
          <p className="max-w-sm text-white/85">Gestão de alunos, treinos e finanças em um só lugar.</p>
        </div>
        <p className="relative text-xs text-white/70">Acesso restrito a usuários autorizados.</p>
      </section>
      <section className="flex items-center justify-center p-6">{children}</section>
    </main>
  );
}
