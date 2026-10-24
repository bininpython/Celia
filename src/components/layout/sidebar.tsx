"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoLockup } from "@/components/brand/logo";
import { NAV } from "@/components/layout/nav";
import { canAccess, type Role } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export function SidebarNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-5 px-3 py-4">
      {NAV.map((section) => {
        const items = section.items.filter((i) => canAccess(role, i.module));
        if (!items.length) return null;
        return (
          <div key={section.title} className="space-y-1">
            <p className="px-2 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">{section.title}</p>
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-muted hover:text-foreground",
                    active && "bg-accent font-medium text-accent-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar({ role }: { role: Role }) {
  return (
    <aside className="no-print sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Link href="/" aria-label="Início">
          <LogoLockup />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarNav role={role} />
      </div>
    </aside>
  );
}
