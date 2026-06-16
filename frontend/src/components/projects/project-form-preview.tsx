"use client";

import { Globe, ListTodo, Lock } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { stripHtmlToPlainText, truncatePlainText } from "@/lib/project-description-plain";

export interface ProjectFormPreviewProps {
  name: string;
  description: string;
  iconUrl: string | null;
  visibility: string;
  /** Shown in preview meta line; defaults to Active for new projects */
  statusLabel?: "Active" | "Draft" | "Archived";
  taskCount?: number;
  className?: string;
}

function visibilityLabel(visibility: string): string {
  return visibility === "PRIVATE" ? "Private" : "Workspace";
}

function PreviewBadge({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: "neutral" | "active" | "archived";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide transition-colors duration-200",
        variant === "active" &&
          "border-emerald-200/50 bg-emerald-50/60 text-emerald-700/90 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400/90",
        variant === "archived" &&
          "border-slate-200/60 bg-slate-100/80 text-slate-500 dark:border-border/50 dark:bg-muted/40 dark:text-muted-foreground",
        variant === "neutral" &&
          "border-slate-200/60 bg-slate-50/60 text-slate-600 dark:border-border/50 dark:bg-muted/20 dark:text-muted-foreground"
      )}
    >
      {children}
    </span>
  );
}

export function ProjectFormPreview({
  name,
  description,
  iconUrl,
  visibility,
  statusLabel = "Active",
  taskCount = 0,
  className,
}: ProjectFormPreviewProps) {
  const displayName = name.trim() || "Untitled project";
  const plainDesc = stripHtmlToPlainText(description);
  const descSnippet = plainDesc
    ? truncatePlainText(plainDesc, 88)
    : "Add a short description for your team.";
  const statusVariant =
    statusLabel === "Active" ? "active" : statusLabel === "Archived" ? "archived" : "neutral";

  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/75">
        Project preview
      </p>
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-br from-white via-[#FCFCFD] to-violet-50/15",
          "shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_14px_-3px_rgba(15,23,42,0.05)]",
          "transition-all duration-200",
          "dark:border-border/60 dark:from-card/90 dark:via-card/70 dark:to-violet-950/10"
        )}
      >
        <div className="p-3.5">
          <div className="flex items-start gap-2.5">
            <div
              className={cn(
                "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg",
                "border border-slate-200/70 bg-muted/30 shadow-sm transition-all duration-200",
                "dark:border-border/50 dark:bg-muted/25"
              )}
            >
              {iconUrl ? (
                <img src={iconUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">
                  {getInitials(displayName) || "—"}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="truncate text-[13px] font-semibold tracking-tight text-foreground transition-colors duration-200">
                {displayName}
              </p>
              <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground transition-colors duration-200">
                {descSnippet}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200/55 bg-slate-50/45 px-3.5 py-2 dark:border-border/40 dark:bg-muted/15">
          <PreviewBadge variant="neutral">
            {visibility === "PRIVATE" ? (
              <Lock className="h-2.5 w-2.5 opacity-70" />
            ) : (
              <Globe className="h-2.5 w-2.5 opacity-70" />
            )}
            {visibilityLabel(visibility)}
          </PreviewBadge>
          <PreviewBadge variant={statusVariant}>{statusLabel}</PreviewBadge>
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <ListTodo className="h-3 w-3 opacity-60" />
            {taskCount} {taskCount === 1 ? "task" : "tasks"}
          </span>
        </div>
      </div>
    </div>
  );
}
