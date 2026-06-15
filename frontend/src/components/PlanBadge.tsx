"use client";

import { Crown, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_CHIP_BASE } from "@/lib/ui/design-tokens";
import type { UserPlanSlug } from "@/services/api/user-plans.api";

const STYLES: Record<UserPlanSlug, string> = {
  free: "bg-slate-100 text-slate-600 border-slate-200/80 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700",
  silver:
    "bg-gradient-to-r from-slate-100 via-slate-50 to-blue-100 text-slate-700 border-blue-200/70 dark:from-slate-700 dark:via-slate-600 dark:to-blue-950 dark:text-slate-100 dark:border-blue-800/50",
  gold: "bg-gradient-to-r from-amber-100 via-amber-50 to-yellow-100 text-amber-900 border-amber-300/70 dark:from-amber-950/40 dark:via-amber-900/30 dark:to-yellow-950/30 dark:text-amber-200 dark:border-amber-700/50",
};

const LABELS: Record<UserPlanSlug, string> = {
  free: "Free",
  silver: "Silver",
  gold: "Gold",
};

export function PlanBadge({
  plan,
  className,
  compact = false,
  showIcon,
}: {
  plan: UserPlanSlug;
  className?: string;
  compact?: boolean;
  showIcon?: boolean;
}) {
  const icon =
    showIcon && plan === "gold" ? (
      <Star className={cn("shrink-0 fill-current", compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
    ) : showIcon && plan === "silver" ? (
      <Crown className={cn("shrink-0 opacity-70", compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
    ) : null;

  return (
    <span
      className={cn(
        APP_CHIP_BASE,
        "rounded-md font-semibold uppercase tracking-[0.04em]",
        compact ? "gap-1 px-2 text-[10px]" : "gap-1.5 px-2.5 text-[11px]",
        STYLES[plan],
        className
      )}
    >
      {icon}
      {LABELS[plan]}
    </span>
  );
}
