"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/financeiro", label: "Lançamentos" },
  { href: "/financeiro/livro-caixa", label: "Livro-caixa" },
  { href: "/financeiro/fluxo-de-caixa", label: "Fluxo de caixa" },
  { href: "/financeiro/dre", label: "DRE gerencial" },
  { href: "/financeiro/orcamento", label: "Orçamento" },
  { href: "/financeiro/categorias", label: "Categorias" },
  { href: "/financeiro/fornecedores", label: "Fornecedores" },
];

export function FinanceNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Financeiro" className="no-print -mx-1 flex gap-1 overflow-x-auto border-b px-1">
      {LINKS.map((l) => {
        const active = l.href === "/financeiro" ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 border-transparent px-3 py-2 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
              active && "border-primary font-medium text-foreground",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
