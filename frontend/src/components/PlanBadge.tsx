"use client";

import { cn } from "@/lib/utils";
import type { UserPlanSlug } from "@/services/api/user-plans.api";

const STYLES: Record<UserPlanSlug, string> = {
  free: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
  silver: "bg-gradient-to-r from-slate-200 to-slate-300 text-slate-800 border-slate-300 dark:from-slate-600 dark:to-slate-500 dark:text-white",
  gold: "bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 border-amber-500",
};

const LABELS: Record<UserPlanSlug, string> = {
  free: "Free",
  silver: "Silver",
  gold: "Gold",
};

export function PlanBadge({
  plan,
  className,
}: {
  plan: UserPlanSlug;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        STYLES[plan],
        className
      )}
    >
      {LABELS[plan]}
    </span>
  );
}
