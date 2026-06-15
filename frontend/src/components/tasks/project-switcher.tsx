"use client";

import { useId, useState } from "react";
import type { Project } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";

const PROJECT_SWATCHES = [
  "bg-indigo-500/15 text-indigo-900 dark:bg-indigo-500/25 dark:text-indigo-100",
  "bg-emerald-500/15 text-emerald-900 dark:bg-emerald-500/25 dark:text-emerald-100",
  "bg-amber-500/15 text-amber-950 dark:bg-amber-500/25 dark:text-amber-100",
  "bg-rose-500/15 text-rose-900 dark:bg-rose-500/25 dark:text-rose-100",
  "bg-sky-500/15 text-sky-900 dark:bg-sky-500/25 dark:text-sky-100",
  "bg-violet-500/15 text-violet-900 dark:bg-violet-500/25 dark:text-violet-100",
] as const;

const TRIGGER_BASE = cn(
  "w-full min-w-0 rounded-lg border border-border/55 bg-background shadow-sm",
  "transition-colors duration-200 hover:bg-muted/20",
  "focus-visible:ring-2 focus-visible:ring-violet-500/20"
);

function hashPick<T extends readonly string[]>(id: string, palette: T): T[number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

function projectInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0];
    const b = parts[1][0];
    if (a && b) return (a + b).toUpperCase();
  }
  const w = name.trim();
  if (w.length >= 2) return w.slice(0, 2).toUpperCase();
  if (w.length === 1) return w.toUpperCase();
  return "?";
}

function ProjectThumb({
  project,
  size = "md",
  className,
}: {
  project: Pick<Project, "id" | "name" | "iconUrl">;
  size?: "sm" | "md";
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const url = project.iconUrl?.trim();
  const showImage = Boolean(url) && !imgFailed;
  const dim = size === "sm" ? "h-5 w-5 text-[8px] rounded-md" : "h-6 w-6 text-[9px] rounded-md";

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border border-border/60 bg-muted/60",
        dim,
        className
      )}
      aria-hidden
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- iconUrl may be data URLs or arbitrary project assets
        <img
          src={url!}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span
          className={cn(
            "flex h-full w-full items-center justify-center font-semibold leading-none",
            hashPick(project.id, PROJECT_SWATCHES)
          )}
        >
          {projectInitials(project.name)}
        </span>
      )}
    </span>
  );
}

interface ProjectSwitcherProps {
  projects: Project[];
  selectedProjectId: string | null;
  selectedTaskCount?: number;
  onProjectChange: (projectId: string) => void;
  disabled?: boolean;
  /** When true, omits built-in label (use BoardSelectorField wrapper) */
  hideLabel?: boolean;
  /** Visible label above the dropdown */
  label?: string;
  /** Compact trigger aligned with workspace selector on command bar */
  compact?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function ProjectSwitcher({
  projects,
  selectedProjectId,
  selectedTaskCount,
  onProjectChange,
  disabled,
  hideLabel = false,
  label = "Project",
  compact = false,
  className,
  triggerClassName,
}: ProjectSwitcherProps) {
  const triggerId = useId();
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div
      className={cn(
        "min-w-0",
        compact ? "w-full min-w-[140px] max-w-[240px] sm:max-w-[280px]" : "w-full min-w-[260px] max-w-[380px]",
        className
      )}
    >
      {!hideLabel && !compact ? (
        <label
          htmlFor={triggerId}
          className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
        >
          {label}
        </label>
      ) : null}
      <Select
        value={selectedProjectId ?? ""}
        onValueChange={onProjectChange}
        disabled={disabled || projects.length === 0}
      >
        <SelectTrigger
          id={triggerId}
          className={cn(
            TRIGGER_BASE,
            compact ? "h-8 px-2 text-[13px]" : "h-10 px-2.5 text-sm",
            triggerClassName
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {selectedProject ? (
              <ProjectThumb project={selectedProject} size="sm" />
            ) : (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-dashed border-muted-foreground/30 bg-muted/40 text-muted-foreground">
                <FolderKanban className="h-3 w-3" />
              </span>
            )}
            <span className="min-w-0 truncate font-medium">
              {selectedProject?.name ?? "Select project"}
            </span>
            {selectedProjectId && selectedTaskCount != null && compact && (
              <Badge
                variant="secondary"
                className="ml-auto shrink-0 border-0 bg-muted/70 px-1 py-0 text-[10px] font-medium tabular-nums"
              >
                {selectedTaskCount}
              </Badge>
            )}
            {selectedProjectId && selectedTaskCount != null && !compact && (
              <Badge variant="secondary" className="ml-auto shrink-0 text-[10px] px-1.5 py-0.5">
                {selectedTaskCount}
              </Badge>
            )}
          </div>
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id} textValue={project.name}>
              <span className="flex min-w-0 items-center gap-2">
                <ProjectThumb project={project} size="md" />
                <span className="truncate">{project.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
