import { cn } from "@/lib/utils";

/**
 * Símbolo vetorial do Studio Personal Célia Barbosa, redesenhado a partir da
 * logo oficial (anel em "U" com dois remates superiores e a barra central).
 */
export function LogoSymbol({ className, title = "Studio Personal Célia Barbosa" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="-1 -1 47 48" className={cn("size-8", className)} role="img" aria-label={title}>
      <title>{title}</title>
      <path
        fill="currentColor"
        d="M0 0H9V4H11Q14 1 18 1V9.22A14.5 14.5 0 1 0 27 9.22V1Q31 1 34 4H36V0H45V24A22.5 22.5 0 0 1 0 24Z"
      />
      <rect x="19.25" y="8" width="6.5" height="15.5" rx="0.8" fill="currentColor" />
    </svg>
  );
}

/** Selo laranja com o símbolo branco — uso em cabeçalhos e ícones. */
export function LogoBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex size-9 items-center justify-center rounded-lg bg-primary text-white", className)}>
      <LogoSymbol className="size-[62%]" />
    </span>
  );
}

export function LogoLockup({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoBadge />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">Studio Personal</span>
          <span className="text-base font-semibold tracking-tight">Célia Barbosa</span>
        </span>
      )}
    </span>
  );
}
