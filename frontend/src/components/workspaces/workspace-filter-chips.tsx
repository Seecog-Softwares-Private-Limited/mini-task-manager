"use client";

import { Archive, CheckCircle2, Layers3 } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkspaceFilterType = "all" | "active" | "archived";

const FILTERS: {
  id: WorkspaceFilterType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "all", label: "Total", icon: Layers3 },
  { id: "active", label: "Active", icon: CheckCircle2 },
  { id: "archived", label: "Archived", icon: Archive },
];

export function WorkspaceFilterChips({
  filter,
  onChange,
  totalCount,
  activeCount,
  archivedCount,
}: {
  filter: WorkspaceFilterType;
  onChange: (filter: WorkspaceFilterType) => void;
  totalCount: number;
  activeCount: number;
  archivedCount: number;
}) {
  const counts = { all: totalCount, active: activeCount, archived: archivedCount };

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {FILTERS.map(({ id, label, icon: Icon }) => {
        const selected = filter === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-all duration-200",
              selected
                ? "border-violet-300/80 bg-gradient-to-r from-violet-500/12 via-indigo-500/10 to-fuchsia-500/10 text-violet-800 shadow-[0_2px_8px_-2px_rgba(109,40,217,0.35)] dark:border-violet-500/45 dark:text-violet-200"
                : "border-slate-200/90 bg-white/90 text-slate-600 hover:-translate-y-px hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm dark:border-border dark:bg-card/80 dark:text-muted-foreground dark:hover:border-border dark:hover:bg-muted/40"
            )}
          >
            <Icon
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                selected ? "text-violet-600 dark:text-violet-300" : "text-slate-400 dark:text-muted-foreground"
              )}
              aria-hidden
            />
            <span className="tabular-nums font-semibold">{counts[id]}</span>
            <span className={cn(selected ? "text-violet-700/90 dark:text-violet-300/90" : "text-slate-500 dark:text-muted-foreground")}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
