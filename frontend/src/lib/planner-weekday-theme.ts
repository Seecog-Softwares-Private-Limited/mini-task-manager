import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Mountain,
  PartyPopper,
  Sparkles,
  Sun,
  Target,
  TreePalm,
} from "lucide-react";

export interface WeekdayTheme {
  index: number;
  short: string;
  long: string;
  icon: LucideIcon;
  headerBg: string;
  headerIconRing: string;
  headerIconColor: string;
  cellTint: string;
  cellBorder: string;
}

/** Sunday = 0 … Saturday = 6 (matches Date.getDay()). */
export const WEEKDAY_THEMES: WeekdayTheme[] = [
  {
    index: 0,
    short: "Sun",
    long: "Sunday",
    icon: Sun,
    headerBg: "bg-rose-500/8 dark:bg-rose-500/10",
    headerIconRing: "bg-rose-500/15 ring-1 ring-rose-400/25",
    headerIconColor: "text-rose-600 dark:text-rose-400",
    cellTint: "bg-rose-500/[0.03] dark:bg-rose-500/[0.06]",
    cellBorder: "border-rose-200/40 dark:border-rose-500/20",
  },
  {
    index: 1,
    short: "Mon",
    long: "Monday",
    icon: Briefcase,
    headerBg: "bg-sky-500/8 dark:bg-sky-500/10",
    headerIconRing: "bg-sky-500/15 ring-1 ring-sky-400/25",
    headerIconColor: "text-sky-600 dark:text-sky-400",
    cellTint: "bg-sky-500/[0.03] dark:bg-sky-500/[0.06]",
    cellBorder: "border-sky-200/40 dark:border-sky-500/20",
  },
  {
    index: 2,
    short: "Tue",
    long: "Tuesday",
    icon: Target,
    headerBg: "bg-violet-500/8 dark:bg-violet-500/10",
    headerIconRing: "bg-violet-500/15 ring-1 ring-violet-400/25",
    headerIconColor: "text-violet-600 dark:text-violet-400",
    cellTint: "bg-violet-500/[0.03] dark:bg-violet-500/[0.06]",
    cellBorder: "border-violet-200/40 dark:border-violet-500/20",
  },
  {
    index: 3,
    short: "Wed",
    long: "Wednesday",
    icon: Mountain,
    headerBg: "bg-emerald-500/8 dark:bg-emerald-500/10",
    headerIconRing: "bg-emerald-500/15 ring-1 ring-emerald-400/25",
    headerIconColor: "text-emerald-600 dark:text-emerald-400",
    cellTint: "bg-emerald-500/[0.03] dark:bg-emerald-500/[0.06]",
    cellBorder: "border-emerald-200/40 dark:border-emerald-500/20",
  },
  {
    index: 4,
    short: "Thu",
    long: "Thursday",
    icon: Sparkles,
    headerBg: "bg-amber-500/8 dark:bg-amber-500/10",
    headerIconRing: "bg-amber-500/15 ring-1 ring-amber-400/25",
    headerIconColor: "text-amber-600 dark:text-amber-400",
    cellTint: "bg-amber-500/[0.03] dark:bg-amber-500/[0.06]",
    cellBorder: "border-amber-200/40 dark:border-amber-500/20",
  },
  {
    index: 5,
    short: "Fri",
    long: "Friday",
    icon: PartyPopper,
    headerBg: "bg-fuchsia-500/8 dark:bg-fuchsia-500/10",
    headerIconRing: "bg-fuchsia-500/15 ring-1 ring-fuchsia-400/25",
    headerIconColor: "text-fuchsia-600 dark:text-fuchsia-400",
    cellTint: "bg-fuchsia-500/[0.03] dark:bg-fuchsia-500/[0.06]",
    cellBorder: "border-fuchsia-200/40 dark:border-fuchsia-500/20",
  },
  {
    index: 6,
    short: "Sat",
    long: "Saturday",
    icon: TreePalm,
    headerBg: "bg-teal-500/8 dark:bg-teal-500/10",
    headerIconRing: "bg-teal-500/15 ring-1 ring-teal-400/25",
    headerIconColor: "text-teal-600 dark:text-teal-400",
    cellTint: "bg-teal-500/[0.03] dark:bg-teal-500/[0.06]",
    cellBorder: "border-teal-200/40 dark:border-teal-500/20",
  },
];

export function getWeekdayTheme(dayIndex: number): WeekdayTheme {
  return WEEKDAY_THEMES[dayIndex] ?? WEEKDAY_THEMES[0];
}
