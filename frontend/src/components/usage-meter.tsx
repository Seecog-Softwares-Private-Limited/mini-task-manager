"use client";

import { cn } from "@/lib/utils";

export interface UsageMeterProps {
  label: string;
  current: number;
  limit: number | null;
  subLabel?: string;
  className?: string;
}

export function UsageMeter({
  label,
  current,
  limit,
  subLabel,
  className,
}: UsageMeterProps) {
  if (limit == null || limit <= 0) {
    return (
      <div className={cn("space-y-2 rounded-xl border bg-muted/20 p-4", className)}>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-semibold">{current}</span>
        </div>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((current / limit) * 100));
  const isWarning = pct >= 80;
  const isOver = current > limit;

  return (
    <div className={cn("space-y-2 rounded-xl border bg-muted/20 p-4", className)} aria-label={`${label}: ${current} of ${limit}`}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">
          {subLabel ?? `${current} / ${limit}`}
          {isOver && (
            <span className="ml-1.5 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">Over limit</span>
          )}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isOver
              ? "bg-destructive"
              : isWarning
                ? "bg-amber-500"
                : "gradient-bg"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
