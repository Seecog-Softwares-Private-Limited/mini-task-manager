"use client";

import { useState, useEffect } from "react";
import { getStreak, recordVisit } from "@/lib/streak-storage";
import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

export function StreakBadge({ className }: { className?: string }) {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const { count } = recordVisit();
    setStreak(count);
  }, []);

  if (streak < 2) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400",
        className
      )}
      title={`${streak} day streak`}
    >
      <Flame className="h-3 w-3" aria-hidden />
      {streak}
    </span>
  );
}
