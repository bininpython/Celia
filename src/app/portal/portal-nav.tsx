"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PORTAL_NAV } from "@/components/layout/nav";
import { cn } from "@/lib/utils";

/** Abas no topo (desktop) e barra inferior (celular). */
export function PortalNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/portal" ? pathname === href : pathname.startsWith(href));
  return (
    <>
      <nav aria-label="Portal do aluno" className="mx-auto hidden max-w-5xl gap-1 px-4 md:flex">
        {PORTAL_NAV.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={isActive(i.href) ? "page" : undefined}
            className={cn("-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground", isActive(i.href) && "border-primary font-medium text-foreground")}
          >
            {i.label}
          </Link>
        ))}
      </nav>
      <nav aria-label="Portal do aluno" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t bg-background md:hidden">
        {PORTAL_NAV.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={isActive(i.href) ? "page" : undefined}
            className={cn("flex flex-col items-center gap-0.5 py-2 text-[10px] text-muted-foreground", isActive(i.href) && "text-primary")}
          >
            <i.icon className="size-5" />
            <span className="truncate">{i.label.replace("Meus ", "")}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
