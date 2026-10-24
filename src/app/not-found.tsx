import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoBadge } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <LogoBadge className="size-12" />
      <h1 className="text-xl font-semibold">Página não encontrada</h1>
      <p className="text-sm text-muted-foreground">O endereço acessado não existe ou foi removido.</p>
      <Button asChild>
        <Link href="/">Voltar ao início</Link>
      </Button>
    </main>
  );
}
