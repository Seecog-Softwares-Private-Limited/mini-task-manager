import type { IssueSeverity, IssueStatus } from "@/types/api";

export const ISSUE_SEVERITY_LABEL: Record<IssueSeverity, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const ISSUE_SEVERITY_BADGE_CLASS: Record<IssueSeverity, string> = {
  LOW: "border-transparent bg-slate-500/10 text-slate-600 dark:text-slate-300",
  MEDIUM: "border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-300",
  HIGH: "border-transparent bg-amber-500/10 text-amber-600 dark:text-amber-300",
  CRITICAL: "border-transparent bg-red-500/10 text-red-600 dark:text-red-300",
};

export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const ISSUE_STATUS_BADGE_CLASS: Record<IssueStatus, string> = {
  OPEN: "border-transparent bg-red-500/10 text-red-600 dark:text-red-300",
  IN_PROGRESS: "border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-300",
  RESOLVED: "border-transparent badge-status-active",
  CLOSED: "border-transparent bg-slate-500/10 text-slate-600 dark:text-slate-300",
};
