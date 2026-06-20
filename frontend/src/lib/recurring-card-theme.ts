/** Visual theme tokens for recurring-board task cards (cadence + overdue state). */

export interface RecurringCardTheme {
  /** Left cadence rail */
  rail: string;
  /** Card surface gradient + border */
  surface: string;
  /** Top-right series ribbon */
  ribbon: string;
  /** Schedule line text */
  schedule: string;
  /** Soft glow blob behind card */
  glow: string;
}

const CADENCE_THEMES: Record<string, RecurringCardTheme> = {
  DAILY: {
    rail: "bg-gradient-to-b from-sky-400 to-cyan-500",
    surface:
      "border-sky-200/50 bg-gradient-to-br from-sky-50/90 via-white to-cyan-50/40 dark:border-sky-500/20 dark:from-sky-950/30 dark:via-card dark:to-cyan-950/20",
    ribbon:
      "border-sky-300/40 bg-gradient-to-r from-sky-500/15 to-cyan-500/10 text-sky-900 dark:border-sky-400/30 dark:text-sky-100",
    schedule: "text-sky-800/80 dark:text-sky-200/80",
    glow: "bg-sky-400/25",
  },
  WEEKLY: {
    rail: "bg-gradient-to-b from-violet-400 to-purple-500",
    surface:
      "border-violet-200/50 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/35 dark:border-violet-500/20 dark:from-violet-950/30 dark:via-card dark:to-fuchsia-950/20",
    ribbon:
      "border-violet-300/40 bg-gradient-to-r from-violet-500/15 to-fuchsia-500/10 text-violet-900 dark:border-violet-400/30 dark:text-violet-100",
    schedule: "text-violet-800/80 dark:text-violet-200/80",
    glow: "bg-violet-400/25",
  },
  MONTHLY: {
    rail: "bg-gradient-to-b from-amber-400 to-orange-500",
    surface:
      "border-amber-200/50 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/35 dark:border-amber-500/20 dark:from-amber-950/25 dark:via-card dark:to-orange-950/20",
    ribbon:
      "border-amber-300/40 bg-gradient-to-r from-amber-500/15 to-orange-500/10 text-amber-900 dark:border-amber-400/30 dark:text-amber-100",
    schedule: "text-amber-900/75 dark:text-amber-200/80",
    glow: "bg-amber-400/25",
  },
  YEARLY: {
    rail: "bg-gradient-to-b from-rose-400 to-pink-500",
    surface:
      "border-rose-200/50 bg-gradient-to-br from-rose-50/90 via-white to-pink-50/35 dark:border-rose-500/20 dark:from-rose-950/25 dark:via-card dark:to-pink-950/20",
    ribbon:
      "border-rose-300/40 bg-gradient-to-r from-rose-500/15 to-pink-500/10 text-rose-900 dark:border-rose-400/30 dark:text-rose-100",
    schedule: "text-rose-800/80 dark:text-rose-200/80",
    glow: "bg-rose-400/25",
  },
};

const DEFAULT_THEME: RecurringCardTheme = {
  rail: "bg-gradient-to-b from-indigo-400 to-violet-500",
  surface:
    "border-indigo-200/45 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/30 dark:border-indigo-500/20 dark:from-indigo-950/25 dark:via-card dark:to-violet-950/20",
  ribbon:
    "border-indigo-300/40 bg-gradient-to-r from-indigo-500/12 to-violet-500/10 text-indigo-900 dark:border-indigo-400/30 dark:text-indigo-100",
  schedule: "text-indigo-800/75 dark:text-indigo-200/80",
  glow: "bg-indigo-400/20",
};

export function getRecurringCardTheme(recurrenceType?: string | null): RecurringCardTheme {
  const key = recurrenceType?.toUpperCase() ?? "";
  return CADENCE_THEMES[key] ?? DEFAULT_THEME;
}

export function recurringCardOverdueSurface(): string {
  return [
    "border-orange-300/55",
    "bg-gradient-to-br from-orange-50/95 via-white to-amber-50/50",
    "dark:border-orange-500/30 dark:from-orange-950/35 dark:via-card dark:to-amber-950/25",
    "recurring-card-overdue-glow",
  ].join(" ");
}

export function recurringCardMissedBadge(tone: "critical" | "warning"): string {
  return tone === "critical"
    ? "recurring-missed-pulse bg-gradient-to-r from-rose-500/15 to-red-500/10 text-rose-700 ring-1 ring-rose-400/25 dark:text-rose-200"
    : "bg-gradient-to-r from-amber-500/12 to-orange-500/8 text-amber-800 ring-1 ring-amber-400/20 dark:text-amber-200";
}
