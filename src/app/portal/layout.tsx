import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { BrandStyle } from "@/components/brand/brand-style";
import { LogoLockup } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { PortalNav } from "./portal-nav";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.role !== "aluno") redirect("/");
  const supabase = await createClient();
  const [{ count }, { data: gym }] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("audience", "student").is("read_at", null),
    supabase.from("gyms").select("primary_color").single(),
  ]);
  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <BrandStyle color={gym?.primary_color} />
      <header className="no-print sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
          <Link href="/portal" aria-label="Início do portal">
            <LogoLockup />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" asChild className="relative">
              <Link href="/portal#avisos" aria-label={`Avisos${count ? ` (${count} novos)` : ""}`}>
                <Bell className="size-4" />
                {!!count && <span className="absolute top-2 right-2 size-2 rounded-full bg-primary" />}
              </Link>
            </Button>
            <ThemeToggle />
            <UserMenu name={user.fullName} email={user.email} role={user.role} />
          </div>
        </div>
        <PortalNav />
      </header>
      <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        {user.studentId ? (
          children
        ) : (
          <p className="rounded-lg border p-6 text-sm text-muted-foreground">Seu acesso ainda não está vinculado a um cadastro de aluno. Procure a recepção.</p>
        )}
      </main>
    </div>
  );
}
