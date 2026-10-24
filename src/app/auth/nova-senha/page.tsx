"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogoLockup } from "@/components/brand/logo";
import { updatePassword, type AuthState } from "@/app/(auth)/actions";

export default function NewPasswordPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePassword, {});
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <LogoLockup />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Definir nova senha</h1>
          <p className="text-sm text-muted-foreground">Mínimo de 8 caracteres.</p>
        </div>
        <form action={action} className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="password">Nova senha</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="confirm">Confirmar senha</Label>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
          </div>
          {state.error && (
            <Alert tone="danger">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          {state.message && (
            <Alert tone="brand">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            Salvar senha
          </Button>
        </form>
        <Link href="/" className="block text-center text-sm text-muted-foreground hover:text-foreground">
          Ir para o sistema
        </Link>
      </div>
    </main>
  );
}
