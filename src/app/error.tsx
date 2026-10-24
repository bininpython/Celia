"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Algo deu errado</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Não foi possível carregar esta página. Tente novamente; se o problema persistir, contate o administrador.
        {error.digest && <span className="mt-2 block font-mono text-xs">Código: {error.digest}</span>}
      </p>
      <Button onClick={reset}>Tentar novamente</Button>
    </main>
  );
}
