import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  change,
  invertChange = false,
  tone = "default",
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  hint?: string;
  /** variação fracionária vs período anterior */
  change?: number | null;
  /** quando true, aumento é ruim (ex.: despesas, inadimplência) */
  invertChange?: boolean;
  tone?: "default" | "brand" | "danger" | "success";
}) {
  const positive = change != null && change > 0;
  const good = change != null && change !== 0 && (invertChange ? !positive : positive);
  return (
    <Card className="gap-3 py-4">
      <div className="flex items-center justify-between px-4">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        {Icon && (
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground",
              tone === "brand" && "bg-accent text-accent-foreground",
              tone === "danger" && "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
              tone === "success" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <div className="px-4">
        <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {change != null && change !== 0 && (
            <span className={cn("inline-flex items-center font-medium", good ? "text-success" : "text-destructive")}>
              {positive ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {formatPercent(Math.abs(change))}
            </span>
          )}
          {hint && <span className="truncate">{hint}</span>}
        </div>
      </div>
    </Card>
  );
}
