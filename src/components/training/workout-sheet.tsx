import { Badge } from "@/components/ui/badge";
import { EQUIPMENT, MUSCLE_GROUPS } from "@/lib/labels";
import { formatNumber } from "@/lib/format";
import type { WorkoutPlanFull } from "@/lib/queries/training";

type Division = WorkoutPlanFull["workout_divisions"][number];
type Item = Division["workout_exercises"][number];

/** Ficha de treino (tela e impressão). `renderAction` adiciona ações por exercício. */
export function WorkoutSheet({
  divisions,
  lastLoads,
  renderAction,
  compact,
}: {
  divisions: Division[];
  lastLoads?: Map<string, number>;
  renderAction?: (item: Item) => React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="space-y-6">
      {divisions.map((d) => (
        <section key={d.id} className="break-inside-avoid">
          <h3 className="mb-2 flex items-center gap-2 font-semibold">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm text-white print:border print:border-black print:bg-white print:text-black">
              {d.label}
            </span>
            {d.name}
          </h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Exercício</th>
                  <th className="px-3 py-2 text-center font-medium">Séries</th>
                  <th className="px-3 py-2 text-center font-medium">Reps</th>
                  <th className="px-3 py-2 text-center font-medium">Carga</th>
                  <th className="px-3 py-2 text-center font-medium">Descanso</th>
                  {renderAction && <th className="px-3 py-2 no-print" />}
                </tr>
              </thead>
              <tbody>
                {d.workout_exercises.map((it, i) => {
                  const last = lastLoads?.get(it.id);
                  return (
                    <tr key={it.id} className="border-t align-top">
                      <td className="px-3 py-2.5">
                        <span className="font-medium">
                          {i + 1}. {it.exercises?.name}
                        </span>
                        {!compact && it.exercises && (
                          <span className="mt-0.5 flex flex-wrap gap-1">
                            <Badge>{MUSCLE_GROUPS[it.exercises.muscle_group] ?? it.exercises.muscle_group}</Badge>
                            <Badge>{EQUIPMENT[it.exercises.equipment] ?? it.exercises.equipment}</Badge>
                          </span>
                        )}
                        {it.notes && <span className="mt-1 block text-xs text-muted-foreground">{it.notes}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums">{it.sets}</td>
                      <td className="px-3 py-2.5 text-center">{it.reps}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums">
                        {it.load_kg != null ? `${formatNumber(Number(it.load_kg))} kg` : "—"}
                        {last != null && <span className="block text-[11px] text-muted-foreground">últ.: {formatNumber(last)} kg</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center">{it.rest_seconds != null ? `${it.rest_seconds}s` : "—"}</td>
                      {renderAction && <td className="no-print px-3 py-2 text-right">{renderAction(it)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
