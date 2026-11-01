import type { EpicStatus } from "@/types/api";

export const EPIC_STATUS_LABEL: Record<EpicStatus, string> = {
  TODO: "Not started",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

export const EPIC_STATUS_BADGE_CLASS: Record<EpicStatus, string> = {
  TODO: "border-transparent bg-slate-500/10 text-slate-600 dark:text-slate-300",
  IN_PROGRESS: "border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-300",
  DONE: "border-transparent badge-status-active",
};

export const EPIC_COLORS = [
  { value: "#7c3aed", label: "Violet" },
  { value: "#0ea5e9", label: "Sky" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#16a34a", label: "Green" },
  { value: "#dc2626", label: "Red" },
  { value: "#64748b", label: "Slate" },
];
