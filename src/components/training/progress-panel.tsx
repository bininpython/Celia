"use client";
import { useMemo, useState } from "react";
import { NativeSelect } from "@/components/ui/native-select";
import { ProgressLine } from "@/components/charts/simple-charts";
import { formatDate } from "@/lib/dates";

export type LogPoint = { exercise_id: string; exercise: string; performed_on: string; load_kg: number | null };

/** Gráfico de progressão de carga por exercício. */
export function ProgressPanel({ logs }: { logs: LogPoint[] }) {
  const exercises = useMemo(() => {
    const m = new Map<string, string>();
    logs.filter((l) => l.load_kg != null).forEach((l) => m.set(l.exercise_id, l.exercise));
    return [...m.entries()];
  }, [logs]);
  const [selected, setSelected] = useState(exercises[0]?.[0] ?? "");
  if (!exercises.length) return <p className="text-sm text-muted-foreground">Registre execuções com carga para acompanhar a evolução.</p>;
  const data = logs
    .filter((l) => l.exercise_id === selected && l.load_kg != null)
    .sort((a, b) => a.performed_on.localeCompare(b.performed_on))
    .map((l) => ({ label: formatDate(l.performed_on).slice(0, 5), value: Number(l.load_kg) }));
  return (
    <div className="space-y-3">
      <NativeSelect aria-label="Exercício" value={selected} onChange={(e) => setSelected(e.target.value)} className="sm:w-72">
        {exercises.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </NativeSelect>
      <ProgressLine data={data} />
    </div>
  );
}
