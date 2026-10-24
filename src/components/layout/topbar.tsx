import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoLockup } from "@/components/brand/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import type { SessionUser } from "@/lib/auth";

export function Topbar({ user, unread }: { user: SessionUser; unread: number }) {
  return (
    <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
      <MobileNav role={user.role} />
      <Link href="/" className="lg:hidden" aria-label="Início">
        <LogoLockup compact />
      </Link>
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" asChild className="relative">
          <Link href="/notificacoes" aria-label={`Notificações${unread ? ` (${unread} não lidas)` : ""}`}>
            <Bell className="size-4" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        </Button>
        <ThemeToggle />
        <UserMenu name={user.fullName} email={user.email} role={user.role} />
      </div>
    </header>
  );
}
