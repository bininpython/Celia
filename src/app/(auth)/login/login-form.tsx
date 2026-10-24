"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogoLockup } from "@/components/brand/logo";
import { signIn, type AuthState } from "../actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signIn, {});
  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="space-y-6">
        <LogoLockup className="lg:hidden" />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
          <p className="text-sm text-muted-foreground">Use o e-mail e a senha fornecidos pela academia.</p>
        </div>
      </div>
      <form action={formAction} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <div className="grid gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link href="/recuperar-senha" className="text-xs text-primary hover:underline">
              Esqueci minha senha
            </Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {state.error && (
          <Alert tone="danger">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} Entrar
        </Button>
      </form>
    </div>
  );
}
