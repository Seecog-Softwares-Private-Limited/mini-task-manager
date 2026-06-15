"use client";

import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  CalendarClock,
  Check,
  Clock,
  CreditCard,
  Eye,
  FolderKanban,
  MoreHorizontal,
  Settings,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkspaceThumb } from "@/components/workspaces/workspace-thumb";
import type { Organization } from "@/types/api";
import type { OrgHealthData } from "@/services/api/organizations.api";
import { cn, formatRelativeTime, isWithinLast24h } from "@/lib/utils";

type OrgHealth = "healthy" | "at-risk" | "critical";

function orgHealthFromData(
  overdueCount: number,
  totalTasks: number,
  lastActivityAt: string | null | undefined
): OrgHealth {
  const hasRecentActivity = isWithinLast24h(lastActivityAt ?? undefined);
  if (totalTasks === 0) return "healthy";
  if (overdueCount >= 5) return "critical";
  if (overdueCount >= 1 || (overdueCount === 0 && !hasRecentActivity && totalTasks > 0)) return "at-risk";
  return "healthy";
}

function OrgHealthDot({
  health,
  loading,
  label,
}: {
  health: OrgHealth;
  loading?: boolean;
  label?: string;
}) {
  if (loading) {
    return <span className="h-2 w-2 shrink-0 rounded-full bg-muted animate-pulse" aria-hidden />;
  }
  const dotClass = {
    healthy: "bg-[hsl(var(--success))]",
    "at-risk": "bg-[hsl(var(--warning))]",
    critical: "bg-destructive/75",
  }[health];
  const ariaLabel = label ?? `Workspace health: ${health}`;
  return (
    <span
      className={cn("h-2 w-2 shrink-0 rounded-full", dotClass)}
      role="status"
      aria-label={ariaLabel}
      title={ariaLabel}
    />
  );
}

function roleBadgeClass(role: string | undefined) {
  const normalized = role?.toLowerCase() ?? "";
  if (/owner/.test(normalized)) return "badge-role-owner";
  if (/admin/.test(normalized)) return "badge-role-admin";
  if (/guest/.test(normalized)) return "badge-role-guest";
  return "badge-role-member";
}

function StatPill({
  icon: Icon,
  label,
  loading,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  loading?: boolean;
  accent?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full items-center gap-1 rounded-md border px-2 text-[11px] font-medium",
        accent
          ? "border-violet-200/70 bg-violet-50/60 text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-300"
          : "border-slate-200/70 bg-slate-50/70 text-slate-600 dark:border-border/60 dark:bg-muted/25 dark:text-muted-foreground"
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
      <span className="truncate">{loading ? "…" : label}</span>
    </span>
  );
}

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
      className="h-7 rounded-md px-2 text-[11px] font-medium text-slate-600 transition-colors duration-150 hover:bg-violet-500/10 hover:text-violet-700 dark:text-slate-300 dark:hover:bg-violet-500/15 dark:hover:text-violet-200"
      onClick={onClick}
    >
      <Icon className="mr-1 h-3 w-3" aria-hidden />
      {label}
    </Button>
  );
}

export interface WorkspaceCardProps {
  org: Organization;
  isCurrent: boolean;
  memberCount: number;
  memberCountLoading: boolean;
  projectCount: number;
  projectCountLoading: boolean;
  planLabel: string;
  planBadgeClass: string;
  lastActivityAt: string | null;
  lastActivityLoading: boolean;
  healthData: OrgHealthData | null;
  healthLoading: boolean;
  archivePending: boolean;
  deletePending: boolean;
  canEdit: boolean;
  onOpen: () => void;
  onPreview: () => void;
  onSettings: () => void;
  onInvite: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onProjects: () => void;
  onBilling: () => void;
}

export function WorkspaceCard({
  org,
  isCurrent,
  memberCount,
  memberCountLoading,
  projectCount,
  projectCountLoading,
  planLabel,
  planBadgeClass,
  lastActivityAt,
  lastActivityLoading,
  healthData,
  healthLoading,
  archivePending,
  deletePending,
  canEdit,
  onOpen,
  onPreview,
  onSettings,
  onInvite,
  onEdit,
  onArchive,
  onDelete,
  onProjects,
  onBilling,
}: WorkspaceCardProps) {
  const roleLabel = org.myRole
    ? org.myRole.charAt(0).toUpperCase() + org.myRole.slice(1).toLowerCase()
    : null;
  const lastActivityRelative = formatRelativeTime(lastActivityAt ?? undefined);
  const activityRecent = isWithinLast24h(lastActivityAt ?? undefined);
  const overdueCount = healthData?.overdueCount ?? 0;
  const dueTodayCount = healthData?.dueTodayCount ?? 0;
  const totalTasks = healthData?.totalTasks ?? 0;
  const completedCount = healthData?.completedCount ?? 0;
  const completionPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const orgHealth = orgHealthFromData(overdueCount, totalTasks, lastActivityAt);
  const showTaskAlerts = !healthLoading && (overdueCount > 0 || dueTodayCount > 0);
  const showProgress = !healthLoading && totalTasks > 0;
  const overdueIsCritical = overdueCount >= 5;

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-current={isCurrent ? "true" : undefined}
      className={cn(
        "group/card relative flex h-full min-h-[172px] cursor-pointer flex-col overflow-hidden rounded-xl border bg-gradient-to-br",
        "from-white via-[#FCFCFD] to-violet-50/10 dark:from-card/80 dark:via-card/60 dark:to-violet-950/10",
        "border-slate-200/90 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_14px_rgba(15,23,42,0.04)]",
        "transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-slate-300/90 hover:shadow-[0_4px_16px_rgba(15,23,42,0.07),0_10px_28px_-10px_rgba(109,40,217,0.14)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/25 focus-visible:ring-offset-2",
        isCurrent
          ? "border-violet-300/50 bg-gradient-to-br from-violet-50/50 via-indigo-50/30 to-fuchsia-50/20 shadow-[0_0_0_1px_rgba(139,92,246,0.1),0_6px_24px_-10px_rgba(109,40,217,0.22)] ring-1 ring-violet-200/35 dark:border-violet-500/30 dark:from-violet-500/[0.07] dark:via-indigo-500/[0.04] dark:to-fuchsia-500/[0.04] dark:ring-violet-500/15"
          : "",
        org.isArchived && "opacity-80 saturate-[0.92]"
      )}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      {isCurrent && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent"
          aria-hidden
        />
      )}

      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3.5">
          <WorkspaceThumb workspace={org} size="card" active={isCurrent} />

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <OrgHealthDot
                  health={orgHealth}
                  loading={healthLoading}
                  label={`${orgHealth}: ${overdueCount} overdue${totalTasks > 0 ? `, ${totalTasks} tasks` : ""}`}
                />
                <h3
                  className="min-w-0 flex-1 text-base font-semibold leading-snug tracking-[-0.01em] text-slate-900 dark:text-foreground"
                  title={org.name}
                >
                  <span className="block truncate">{org.name}</span>
                </h3>
              </div>

              {isCurrent && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-200/70 bg-violet-500/[0.08] px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:border-violet-500/30 dark:text-violet-300">
                  <Check className="h-3 w-3 shrink-0 stroke-[2.5]" aria-hidden />
                  Active Workspace
                </span>
              )}
            </div>

            <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground/85" title={org.slug}>
              {org.slug}
            </p>

            <div className="mt-2 flex min-h-[20px] flex-wrap items-center gap-1">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                  planBadgeClass
                )}
              >
                {planLabel}
              </span>
              {roleLabel && (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                    roleBadgeClass(org.myRole)
                  )}
                >
                  {roleLabel}
                </span>
              )}
              {org.isArchived && (
                <span className="inline-flex items-center rounded-full bg-slate-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Archived
                </span>
              )}
            </div>

            <div className="mt-2.5 flex min-h-[24px] flex-wrap items-center gap-1">
              <StatPill
                icon={Users}
                label={`${memberCount} member${memberCount !== 1 ? "s" : ""}`}
                loading={memberCountLoading}
              />
              <StatPill
                icon={FolderKanban}
                label={`${projectCount} project${projectCount !== 1 ? "s" : ""}`}
                loading={projectCountLoading}
              />
              {!lastActivityLoading && lastActivityRelative ? (
                <StatPill
                  icon={Clock}
                  label={activityRecent ? `Active ${lastActivityRelative}` : lastActivityRelative}
                  accent={activityRecent}
                />
              ) : lastActivityLoading ? (
                <StatPill icon={Clock} label="…" loading />
              ) : null}
            </div>

            {showProgress && (
              <div className="mt-2.5">
                <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Tasks completed</span>
                  <span className="tabular-nums font-medium">{completionPercent}%</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-muted/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
                    style={{ width: `${completionPercent}%` }}
                    role="progressbar"
                    aria-valuenow={completionPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${completionPercent}% tasks completed`}
                  />
                </div>
              </div>
            )}

            {showTaskAlerts ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
                {overdueCount > 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      overdueIsCritical
                        ? "text-red-600/80 dark:text-red-400/80"
                        : "text-amber-700/75 dark:text-amber-400/75"
                    )}
                  >
                    <AlertCircle className="h-3 w-3 opacity-80" aria-hidden />
                    <span>{overdueCount} overdue</span>
                  </span>
                )}
                {dueTodayCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground/85">
                    <CalendarClock className="h-3 w-3 opacity-70" aria-hidden />
                    <span>{dueTodayCount} due today</span>
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-2 hidden min-h-[16px] sm:block" aria-hidden />
            )}
          </div>
        </div>

        <div
          className={cn(
            "mt-auto hidden min-h-[30px] items-center gap-0.5 border-t border-transparent pt-1.5 opacity-0 transition-all duration-200 ease-out",
            "group-hover/card:border-slate-200/70 group-hover/card:opacity-100 group-focus-within/card:border-slate-200/70 group-focus-within/card:opacity-100",
            "dark:group-hover/card:border-border/50 dark:group-focus-within/card:border-border/50",
            "max-sm:hidden"
          )}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <QuickAction label="Open" icon={ArrowUpRight} onClick={onOpen} />
          <QuickAction label="Invite" icon={UserPlus} onClick={onInvite} />
          <QuickAction label="Settings" icon={Settings} onClick={onSettings} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 rounded-md px-2 text-[11px] font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-500/10 dark:text-slate-300"
              >
                <MoreHorizontal className="mr-1 h-3 w-3" aria-hidden />
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onPreview}>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onProjects}>
                <FolderKanban className="mr-2 h-4 w-4" />
                Projects
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Settings className="mr-2 h-4 w-4" />
                  Edit workspace
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onBilling}>
                <CreditCard className="mr-2 h-4 w-4" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onArchive} disabled={archivePending}>
                {org.isArchived ? (
                  <>
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                    Restore
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </>
                )}
              </DropdownMenuItem>
              {org.myRole?.toLowerCase() === "owner" && (
                <DropdownMenuItem
                  onClick={onDelete}
                  disabled={deletePending}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div
          className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-200/60 pt-2 dark:border-border/50 sm:hidden"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Button size="sm" className="h-7 rounded-md px-2.5 text-[11px]" onClick={onOpen}>
            Open
          </Button>
          <Button size="sm" variant="outline" className="h-7 rounded-md px-2.5 text-[11px]" onClick={onInvite}>
            Invite
          </Button>
          <Button size="sm" variant="outline" className="h-7 rounded-md px-2.5 text-[11px]" onClick={onSettings}>
            Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
