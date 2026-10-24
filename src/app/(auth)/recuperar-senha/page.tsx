"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requestPasswordReset, type AuthState } from "../actions";

export default function RecoverPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, {});
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Recuperar senha</h1>
        <p className="text-sm text-muted-foreground">Enviaremos um link de redefinição para o seu e-mail.</p>
      </div>
      <form action={action} className="space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
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
          Enviar link
        </Button>
      </form>
      <Link href="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground">
        Voltar ao login
      </Link>
    </div>
  );
}
