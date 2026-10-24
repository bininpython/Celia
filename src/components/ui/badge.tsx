import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted text-muted-foreground",
        success: "border-transparent bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
        warning: "border-transparent bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
        danger: "border-transparent bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
        brand: "border-transparent bg-accent text-accent-foreground",
        info: "border-transparent bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

function Badge({ className, tone, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { Badge, badgeVariants };
