"use client";

import Link from "next/link";
import { usePlanOptional } from "@/context/plan-context";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysLeft(endsAt: Date): number {
  const now = new Date();
  const diff = endsAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / MS_PER_DAY));
}

export function TrialBanner() {
  const plan = usePlanOptional();
  if (!plan?.isTrial || !plan.trialEndsAt) return null;

  const days = daysLeft(plan.trialEndsAt);
  const isUrgent = days < 5;
  const dateStr = plan.trialEndsAt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-3 border-b px-4 py-2.5 text-center text-sm",
        isUrgent
          ? "border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 text-amber-800 dark:text-amber-200"
          : "border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 text-foreground"
      )}
      role="status"
      aria-live="polite"
    >
      <Zap className={cn("h-4 w-4", isUrgent ? "text-amber-500" : "text-primary")} />
      <span className="font-medium">
        Trial ends in {days} {days === 1 ? "day" : "days"}
      </span>
      <span className="text-muted-foreground">({dateStr})</span>
      <Link
        href="/dashboard/billing"
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold transition-colors",
          isUrgent
            ? "bg-amber-500 text-white hover:bg-amber-600"
            : "gradient-bg text-white hover:brightness-110"
        )}
      >
        Upgrade now
      </Link>
    </div>
  );
}
