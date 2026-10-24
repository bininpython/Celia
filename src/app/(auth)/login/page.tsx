import type { Metadata } from "next";
import { isDemoMode } from "@/lib/env";
import { DemoPicker } from "./demo-picker";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (isDemoMode()) return <DemoPicker />;
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return <LoginForm next={next} />;
}
