"use client";

import {
  Archive,
  ArrowUpRight,
  CalendarClock,
  Check,
  Eye,
  FolderKanban,
  ListTodo,
  Lock,
  MoreHorizontal,
  Pencil,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Project } from "@/types/api";
import { cn, getInitials } from "@/lib/utils";
import { stripHtmlToPlainText, truncatePlainText } from "@/lib/project-description-plain";

export type ProjectHealthBadge = "on-track" | "at-risk" | "blocked" | "delayed";

export function projectHealthBadge(
  overdueCount: number,
  progressPercent: number,
  totalTasks: number
): ProjectHealthBadge {
  if (totalTasks === 0) return "on-track";
  if (overdueCount >= 5 && progressPercent < 15) return "blocked";
  if (overdueCount >= 3 || progressPercent < 25) return "delayed";
  if (overdueCount >= 1 || progressPercent < 50) return "at-risk";
  return "on-track";
}

const HEALTH_CONFIG: Record<
  ProjectHealthBadge,
  {
    label: string;
    tooltip: string;
    pill: string;
    dot: string;
    summaryBg: string;
    summaryBorder: string;
  }
> = {
  "on-track": {
    label: "On Track",
    tooltip: "No overdue tasks and healthy progress.",
    pill: "border-emerald-200/45 bg-emerald-50/55 text-emerald-700/85 dark:border-emerald-500/18 dark:bg-emerald-500/8 dark:text-emerald-300/85",
    dot: "bg-emerald-400/70",
    summaryBg: "bg-emerald-50/35 dark:bg-emerald-500/5",
    summaryBorder: "border-emerald-200/45 dark:border-emerald-500/15",
  },
  "at-risk": {
    label: "At Risk",
    tooltip: "Some overdue tasks or progress below 50%.",
    pill: "border-orange-200/40 bg-orange-50/45 text-orange-700/70 dark:border-orange-500/16 dark:bg-orange-500/8 dark:text-orange-300/75",
    dot: "bg-orange-400/60",
    summaryBg: "bg-orange-50/30 dark:bg-orange-500/5",
    summaryBorder: "border-orange-200/40 dark:border-orange-500/12",
  },
  delayed: {
    label: "Delayed",
    tooltip: "Multiple overdue tasks or progress below 25%.",
    pill: "border-amber-200/40 bg-amber-50/50 text-amber-800/65 dark:border-amber-500/16 dark:bg-amber-500/8 dark:text-amber-200/75",
    dot: "bg-amber-400/55",
    summaryBg: "bg-amber-50/30 dark:bg-amber-500/5",
    summaryBorder: "border-amber-200/40 dark:border-amber-500/12",
  },
  blocked: {
    label: "Blocked",
    tooltip: "Critically overdue with very low completion.",
    pill: "border-red-200/45 bg-red-50/45 text-red-700/75 dark:border-red-500/18 dark:bg-red-500/8 dark:text-red-300/80",
    dot: "bg-red-500/60",
    summaryBg: "bg-red-50/22 dark:bg-red-500/5",
    summaryBorder: "border-red-200/35 dark:border-red-500/12",
  },
};

export const PROJECT_HEALTH_CONFIG = HEALTH_CONFIG;

type ProjectMember = {
  id: string;
  role?: string;
  user?: { fullName?: string; email?: string; avatarUrl?: string };
};

function QuickAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 flex-1 rounded-md px-1.5 text-[10px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-violet-500/10 hover:text-violet-700 dark:hover:bg-violet-500/15 dark:hover:text-violet-200"
      onClick={onClick}
    >
      <Icon className="mr-1 h-3 w-3 shrink-0" aria-hidden />
      {label}
    </Button>
  );
}

function MemberAvatarStack({
  members,
  loading,
}: {
  members: ProjectMember[];
  loading?: boolean;
}) {
  if (loading) {
    return <span className="h-7 w-14 animate-pulse rounded-full bg-muted" />;
  }
  if (members.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Users className="h-3.5 w-3.5 opacity-60" />
        No members
      </span>
    );
  }

  const visible = members.slice(0, 3);
  const overflow = members.length - visible.length;

  return (
    <TooltipProvider delayDuration={250}>
      <span className="inline-flex h-7 items-center gap-2">
        <span className="inline-flex items-center gap-0.5">
          {visible.map((m) => {
            const name = m.user?.fullName ?? m.user?.email ?? "Member";
            const role = m.role?.toLowerCase() ?? "member";
            return (
              <Tooltip key={m.id}>
                <TooltipTrigger asChild>
                  <Avatar className="h-7 w-7 border-2 border-white shadow-sm ring-1 ring-slate-200/35 transition-transform duration-150 hover:z-10 hover:scale-105 dark:border-card dark:ring-border/35">
                    <AvatarImage src={m.user?.avatarUrl} />
                    <AvatarFallback className="bg-violet-100 text-[9px] font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-200">
                      {getInitials(name)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-medium">{name}</p>
                  <p className="capitalize text-muted-foreground">{role}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </span>
        {overflow > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex h-7 min-w-[1.75rem] cursor-default items-center justify-center rounded-full border border-slate-200/60 bg-muted/70 px-1.5 text-[10px] font-semibold text-muted-foreground shadow-sm dark:border-border/50">
                +{overflow}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {members
                .slice(3)
                .map((m) => m.user?.fullName ?? m.user?.email ?? "Member")
                .join(", ")}
            </TooltipContent>
          </Tooltip>
        )}
      </span>
    </TooltipProvider>
  );
}

export function ProjectHealthPill({
  health,
  loading,
  showTooltip = true,
}: {
  health: ProjectHealthBadge;
  loading?: boolean;
  showTooltip?: boolean;
}) {
  if (loading) {
    return <span className="h-5 w-[4.5rem] animate-pulse rounded-full bg-muted" />;
  }
  const cfg = HEALTH_CONFIG[health];
  const pill = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
        cfg.pill
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", cfg.dot)} aria-hidden />
      {cfg.label}
    </span>
  );

  if (!showTooltip) return pill;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex cursor-help rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30">
            {pill}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          <p className="font-medium">{cfg.label}</p>
          <p className="text-muted-foreground">{cfg.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function VisibilityBadge({ visibility }: { visibility: string }) {
  if (visibility !== "PRIVATE") {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200/60 bg-slate-50/60 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-500 dark:border-border/50 dark:bg-muted/20 dark:text-muted-foreground">
        Public
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full border border-slate-200/60 bg-slate-50/60 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-600 dark:border-border/50 dark:bg-muted/20 dark:text-muted-foreground">
      <Lock className="h-2.5 w-2.5 opacity-70" />
      Private
    </span>
  );
}

function StatusBadge({ archived }: { archived: boolean }) {
  if (archived) {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200/60 bg-slate-100/80 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-500 dark:border-border/50 dark:bg-muted/40 dark:text-muted-foreground">
        Archived
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-200/50 bg-emerald-50/50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-emerald-700/90 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400/90">
      Active
    </span>
  );
}

export interface ProjectCardProps {
  project: Project;
  isSelected?: boolean;
  animationDelay?: number;
  tasksLoading?: boolean;
  membersLoading?: boolean;
  totalTasks: number;
  completedCount: number;
  progressPercent: number;
  overdueCount: number;
  members: ProjectMember[];
  updatedRelative?: string;
  onOpen: () => void;
  onViewTasks: () => void;
  onEdit: () => void;
  onMembers: () => void;
  onSettings: () => void;
  onPreview: () => void;
  onRemove: () => void;
}

export function ProjectCard({
  project: p,
  isSelected = false,
  animationDelay = 0,
  tasksLoading = false,
  membersLoading = false,
  totalTasks,
  completedCount,
  progressPercent,
  overdueCount,
  members,
  updatedRelative,
  onOpen,
  onViewTasks,
  onEdit,
  onMembers,
  onSettings,
  onPreview,
  onRemove,
}: ProjectCardProps) {
  const isTemp = p.id.startsWith("temp-");
  const health = projectHealthBadge(overdueCount, progressPercent, totalTasks);
  const showCriticalOverdue = health === "blocked" && overdueCount > 0;
  const description =
    truncatePlainText(stripHtmlToPlainText(p.description), 120) || "No description";
  const displayTotal = totalTasks > 0 ? totalTasks : 0;
  const displayCompleted = totalTasks > 0 ? completedCount : 0;

  return (
    <Card
      role="button"
      tabIndex={isTemp ? -1 : 0}
      aria-current={isSelected ? "true" : undefined}
      className={cn(
        "group/card relative flex h-full min-h-[188px] cursor-pointer flex-col overflow-hidden rounded-xl border bg-gradient-to-br",
        "from-white via-[#FCFCFD] to-violet-50/10 dark:from-card/80 dark:via-card/60 dark:to-violet-950/10",
        "border-slate-200/90 shadow-[0_1px_3px_rgba(15,23,42,0.05)]",
        "transition-[transform,box-shadow,border-color] duration-150 ease-out",
        "hover:-translate-y-px hover:border-slate-300/90 hover:shadow-[0_3px_12px_rgba(15,23,42,0.06),0_6px_20px_-10px_rgba(109,40,217,0.1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/25 focus-visible:ring-offset-2",
        isSelected &&
          "border-violet-300/40 bg-gradient-to-br from-violet-50/35 via-indigo-50/20 to-fuchsia-50/10 ring-1 ring-violet-200/20 dark:border-violet-500/20 dark:from-violet-500/[0.05] dark:via-indigo-500/[0.02] dark:to-fuchsia-500/[0.02] dark:ring-violet-500/10",
        p.isArchived && "opacity-85 saturate-[0.92]",
        isTemp && "pointer-events-none opacity-70"
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
      onClick={() => !isTemp && onOpen()}
      onKeyDown={(e) => {
        if (isTemp) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      {!isTemp && (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-8 items-center gap-0.5 border-t border-slate-200/50 bg-gradient-to-t from-white via-white/95 to-white/80 px-1.5 opacity-0 backdrop-blur-sm transition-opacity duration-150",
            "group-hover/card:pointer-events-auto group-hover/card:opacity-100 group-focus-within/card:pointer-events-auto group-focus-within/card:opacity-100",
            "dark:border-border/50 dark:from-card dark:via-card/95 dark:to-card/80 max-sm:hidden"
          )}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <QuickAction label="Open" icon={ArrowUpRight} onClick={onOpen} />
          <QuickAction label="Tasks" icon={ListTodo} onClick={onViewTasks} />
          <QuickAction label="Members" icon={Users} onClick={onMembers} />
          <QuickAction label="Settings" icon={Settings} onClick={onSettings} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="pointer-events-auto h-7 flex-1 rounded-md px-1.5 text-[10px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-slate-500/10"
              >
                <MoreHorizontal className="mr-1 h-3 w-3" aria-hidden />
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onPreview}>
                <Eye className="mr-2 h-4 w-4" />
                Quick preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpen}>
                <FolderKanban className="mr-2 h-4 w-4" />
                Open board
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onRemove}
                className="text-destructive focus:text-destructive"
              >
                {p.isArchived ? (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive or delete
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Archive or delete
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <CardContent className="flex flex-1 flex-col p-4 pb-3.5">
        <div className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200/80 bg-primary/10 shadow-sm dark:border-border/70",
                isSelected && "border-violet-200/60 shadow-violet-500/10"
              )}
            >
              {p.iconUrl ? (
                <img src={p.iconUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <FolderKanban className="h-4 w-4 text-primary" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start gap-x-2 gap-y-0.5">
                <h3
                  className="min-w-0 flex-1 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-slate-900 [overflow-wrap:anywhere] dark:text-foreground"
                  title={p.name}
                >
                  {p.name}
                </h3>
                {isSelected && (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-violet-200/50 bg-violet-500/[0.05] px-1 py-px text-[8px] font-medium tracking-wide text-violet-600/90 dark:border-violet-500/20 dark:text-violet-400/90">
                    <Check className="h-2 w-2 shrink-0 stroke-[2.5]" aria-hidden />
                    Selected
                  </span>
                )}
              </div>
              <div className="mt-1">
                <ProjectHealthPill health={health} loading={tasksLoading} />
              </div>
            </div>
          </div>

          <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-[13px] leading-snug text-muted-foreground">
            {description}
          </p>

          <div className="mt-2 space-y-1">
            {tasksLoading ? (
              <span className="text-[11px] text-muted-foreground">Loading progress…</span>
            ) : displayTotal > 0 ? (
              <>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  <span className="font-medium tabular-nums text-foreground/90">
                    {progressPercent}% complete
                  </span>
                  <span className="mx-1.5 text-border/60">·</span>
                  <span className="tabular-nums">
                    {displayCompleted} of {displayTotal} tasks
                  </span>
                </p>
                <div className="h-1 overflow-hidden rounded-full bg-slate-100/90 dark:bg-muted/50">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500/65 to-indigo-500/65 transition-[width] duration-500 ease-out group-hover/card:from-violet-500/85 group-hover/card:to-indigo-500/85"
                    style={{ width: `${Math.min(100, progressPercent)}%` }}
                    role="progressbar"
                    aria-valuenow={progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${progressPercent}% complete, ${displayCompleted} of ${displayTotal} tasks`}
                  />
                </div>
              </>
            ) : (
              <p className="text-[11px] text-muted-foreground">No tasks yet</p>
            )}
          </div>

          {!tasksLoading && overdueCount > 0 && (
            <p className="mt-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] font-medium",
                  showCriticalOverdue
                    ? "text-red-600/65 dark:text-red-400/60"
                    : "text-amber-700/42 dark:text-amber-500/38"
                )}
              >
                <CalendarClock className="h-3 w-3 opacity-50" aria-hidden />
                {overdueCount} overdue
              </span>
            </p>
          )}

          <div className="mt-auto flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-200/50 pt-2.5 dark:border-border/50">
            <MemberAvatarStack members={members} loading={membersLoading} />
            <div className="flex shrink-0 flex-wrap items-center gap-1">
              <VisibilityBadge visibility={p.visibility ?? "PRIVATE"} />
              <StatusBadge archived={p.isArchived} />
            </div>
          </div>

          {updatedRelative && (
            <p
              className="mt-1 text-right text-[10px] text-muted-foreground/55"
              title={p.updatedAt ? new Date(p.updatedAt).toLocaleString() : undefined}
            >
              Updated {updatedRelative}
            </p>
          )}
        </div>

        {!isTemp && (
          <div
            className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-200/60 pt-2 dark:border-border/50 sm:hidden"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Button size="sm" className="h-7 rounded-md px-2.5 text-[11px]" onClick={onOpen}>
              Open
            </Button>
            <Button size="sm" variant="outline" className="h-7 rounded-md px-2.5 text-[11px]" onClick={onViewTasks}>
              Tasks
            </Button>
            <Button size="sm" variant="outline" className="h-7 rounded-md px-2.5 text-[11px]" onClick={onMembers}>
              Members
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
