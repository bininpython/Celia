import { formatNumber } from "@/lib/format";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Mapa de calor de check-ins por dia da semana × hora (sequencial, um tom). */
export function CheckinHeatmap({ data }: { data: { dow: number; hour: number; total: number }[] }) {
  const hours = Array.from({ length: 17 }, (_, i) => i + 5); // 05h–21h
  const max = Math.max(1, ...data.map((d) => d.total));
  const get = (dow: number, h: number) => data.find((d) => d.dow === dow && d.hour === h)?.total ?? 0;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-[2px] text-[11px]" aria-label="Check-ins por dia e horário">
        <thead>
          <tr>
            <th className="w-10" />
            {hours.map((h) => (
              <th key={h} scope="col" className="font-normal text-muted-foreground">
                {h}h
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((d, dow) => (
            <tr key={d}>
              <th scope="row" className="pr-1 text-left font-normal text-muted-foreground">
                {d}
              </th>
              {hours.map((h) => {
                const v = get(dow, h);
                return (
                  <td
                    key={h}
                    title={`${d} ${h}h: ${formatNumber(v)} check-ins`}
                    className="h-6 min-w-6 rounded-[3px] text-center"
                    style={{
                      background: v ? `color-mix(in oklab, var(--chart-income) ${15 + (v / max) * 85}%, var(--muted))` : "var(--muted)",
                    }}
                  >
                    <span className="sr-only">{v}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>Menos</span>
        <span className="h-2 w-24 rounded-full" style={{ background: "linear-gradient(90deg, var(--muted), var(--chart-income))" }} />
        <span>Mais</span>
      </div>
    </div>
  );
}
