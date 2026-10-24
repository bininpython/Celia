"use client";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function useSetParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const set = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(updates).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!("pagina" in updates)) next.delete("pagina");
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };
  return { params, set, pending };
}

export function SearchInput({ placeholder = "Pesquisar…", param = "q", className }: { placeholder?: string; param?: string; className?: string }) {
  const { params, set } = useSetParams();
  const [value, setValue] = useState(params.get(param) ?? "");
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get(param) ?? "") !== value) set({ [param]: value || null });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className={cn("relative w-full sm:w-64", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        aria-label={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  );
}

export function SelectFilter({
  param,
  options,
  label,
  className,
}: {
  param: string;
  options: { value: string; label: string }[];
  label: string;
  className?: string;
}) {
  const { params, set } = useSetParams();
  return (
    <NativeSelect
      aria-label={label}
      className={cn("w-full sm:w-44", className)}
      value={params.get(param) ?? ""}
      onChange={(e) => set({ [param]: e.target.value || null })}
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </NativeSelect>
  );
}

export type PeriodPreset = { label: string; from: string; to: string };

export function PeriodFilter({ from, to, presets }: { from: string; to: string; presets: PeriodPreset[] }) {
  const { set, pending } = useSetParams();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  useEffect(() => {
    setF(from);
    setT(to);
  }, [from, to]);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect
        aria-label="Período predefinido"
        className="w-full sm:w-44"
        value={presets.find((p) => p.from === from && p.to === to)?.label ?? ""}
        onChange={(e) => {
          const p = presets.find((x) => x.label === e.target.value);
          if (p) set({ de: p.from, ate: p.to });
        }}
      >
        <option value="">Personalizado</option>
        {presets.map((p) => (
          <option key={p.label} value={p.label}>
            {p.label}
          </option>
        ))}
      </NativeSelect>
      <Input type="date" aria-label="Data inicial" value={f} onChange={(e) => setF(e.target.value)} className="w-[9.5rem]" />
      <Input type="date" aria-label="Data final" value={t} onChange={(e) => setT(e.target.value)} className="w-[9.5rem]" />
      <Button variant="outline" size="sm" disabled={pending || !f || !t || f > t} onClick={() => set({ de: f, ate: t })}>
        Aplicar
      </Button>
    </div>
  );
}

export function Pagination({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const { set } = useSetParams();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="flex items-center justify-between gap-2 pt-3 text-sm text-muted-foreground">
      <span>
        {total} registros · página {page} de {pages}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => set({ pagina: String(page - 1) })}>
          Anterior
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => set({ pagina: String(page + 1) })}>
          Próxima
        </Button>
      </div>
    </div>
  );
}
