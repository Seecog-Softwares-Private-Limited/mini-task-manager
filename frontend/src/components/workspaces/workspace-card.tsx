"use client";

import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  CalendarClock,
  Check,
  Clock,
  Eye,
  FolderKanban,
  MoreHorizontal,
  Settings,
  Trash2,
  UserPlus,
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
import { WorkspaceThumb } from "@/components/workspaces/workspace-thumb";
import type { Organization, OrgMember } from "@/types/api";
import type { OrgHealthData } from "@/services/api/organizations.api";
import { cn, formatRelativeTime, getInitials, isWithinLast24h } from "@/lib/utils";

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
  className,
}: {
  health: OrgHealth;
  loading?: boolean;
  label?: string;
  className?: string;
}) {
  if (loading) {
    return <span className={cn("h-2 w-2 shrink-0 rounded-full bg-muted animate-pulse", className)} aria-hidden />;
  }
  const dotClass = {
    healthy: "bg-[hsl(var(--success))]",
    "at-risk": "bg-[hsl(var(--warning))]/80",
    critical: "bg-destructive/75",
  }[health];
  const ariaLabel = label ?? `Workspace health: ${health}`;
  return (
    <span
      className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dotClass, className)}
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
        "inline-flex h-6 max-w-full items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors duration-200",
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
      className="h-7 flex-1 rounded-md px-1.5 text-[10px] font-medium text-muted-foreground transition-colors duration-200 hover:bg-violet-500/10 hover:text-violet-700 dark:hover:bg-violet-500/15 dark:hover:text-violet-200"
      onClick={onClick}
    >
      <Icon className="mr-1 h-3 w-3 shrink-0" aria-hidden />
      {label}
    </Button>
  );
}

function MemberAvatarStack({
  members,
  totalCount,
  loading,
}: {
  members: OrgMember[];
  totalCount: number;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <span className="inline-flex h-6 items-center">
        <span className="h-5 w-5 animate-pulse rounded-full bg-muted" />
      </span>
    );
  }
  if (members.length === 0) return null;

  const visible = members.slice(0, 3);
  const overflow = Math.max(0, totalCount - visible.length);

  return (
    <span className="inline-flex h-7 items-center">
      <span className="inline-flex -space-x-2">
        {visible.map((member) => {
          const name = member.user?.fullName ?? member.user?.email ?? "?";
          return (
            <Avatar
              key={member.id}
              className="h-6 w-6 border-2 border-white shadow-sm dark:border-card"
              title={name}
            >
              {member.user?.avatarUrl ? (
                <AvatarImage src={member.user.avatarUrl} alt={name} />
              ) : null}
              <AvatarFallback className="bg-violet-100 text-[9px] font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-200">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
          );
        })}
        {overflow > 0 && (
          <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full border-2 border-white bg-muted/80 px-1 text-[9px] font-semibold text-muted-foreground shadow-sm dark:border-card">
            +{overflow}
          </span>
        )}
      </span>
    </span>
  );
}

export interface WorkspaceCardProps {
  org: Organization;
  isCurrent: boolean;
  memberCount: number;
  memberCountLoading: boolean;
  memberPreview?: OrgMember[];
  memberPreviewLoading?: boolean;
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
  memberPreview = [],
  memberPreviewLoading,
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
  const overdueIsCritical = overdueCount >= 10;

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-current={isCurrent ? "true" : undefined}
      className={cn(
        "group/card relative flex h-full min-h-[180px] cursor-pointer flex-col overflow-hidden rounded-xl border bg-gradient-to-br",
        "from-white via-[#FCFCFD] to-violet-50/10 dark:from-card/80 dark:via-card/60 dark:to-violet-950/10",
        "border-slate-200/90 shadow-[0_1px_3px_rgba(15,23,42,0.05)]",
        "transition-[transform,box-shadow,border-color] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-slate-300/90 hover:shadow-[0_4px_16px_rgba(15,23,42,0.07),0_8px_24px_-12px_rgba(109,40,217,0.12)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/25 focus-visible:ring-offset-2",
        isCurrent
          ? "border-violet-300/40 bg-gradient-to-br from-violet-50/35 via-indigo-50/20 to-fuchsia-50/10 ring-1 ring-violet-200/20 dark:border-violet-500/20 dark:from-violet-500/[0.05] dark:via-indigo-500/[0.02] dark:to-fuchsia-500/[0.02] dark:ring-violet-500/10"
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
      {/* Hover quick actions */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 flex items-center gap-0.5 border-t border-slate-200/60 bg-white/95 px-1.5 py-1 opacity-0 backdrop-blur-sm transition-all duration-200",
          "group-hover/card:opacity-100 group-focus-within/card:opacity-100",
          "dark:border-border/50 dark:bg-card/95 max-sm:hidden"
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
              className="h-7 flex-1 rounded-md px-1.5 text-[10px] font-medium text-muted-foreground transition-colors duration-200 hover:bg-slate-500/10"
            >
              <MoreHorizontal className="mr-1 h-3 w-3" aria-hidden />
              More
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
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
            <DropdownMenuItem onClick={onBilling}>Billing</DropdownMenuItem>
            {org.myRole?.toLowerCase() === "owner" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  disabled={deletePending}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardContent className="flex flex-1 flex-col p-5 pb-3 sm:group-hover/card:pb-10">
        <div className="flex items-start gap-3.5">
          <WorkspaceThumb workspace={org} size="card" active={isCurrent} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
              <div className="flex min-w-0 flex-1 items-start gap-1.5">
                <OrgHealthDot
                  health={orgHealth}
                  loading={healthLoading}
                  label={`${orgHealth}: ${overdueCount} overdue${totalTasks > 0 ? `, ${totalTasks} tasks` : ""}`}
                />
                <h3
                  className="min-w-0 flex-1 text-base font-semibold leading-snug tracking-[-0.01em] text-slate-900 [overflow-wrap:anywhere] dark:text-foreground"
                  title={org.name}
                >
                  {org.name}
                </h3>
              </div>
              {isCurrent && (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-violet-200/50 bg-violet-500/[0.05] px-1 py-px text-[8px] font-medium tracking-wide text-violet-600/90 dark:border-violet-500/20 dark:text-violet-400/90">
                  <Check className="h-2 w-2 shrink-0 stroke-[2.5]" aria-hidden />
                  Active
                </span>
              )}
            </div>

            <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground/80" title={org.slug}>
              {org.slug}
            </p>

            <div className="mt-2.5 flex min-h-[20px] flex-wrap items-center gap-1">
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

            <div className="mt-3 flex min-h-[24px] flex-wrap items-center gap-1.5">
              <MemberAvatarStack
                members={memberPreview}
                totalCount={memberCount}
                loading={memberPreviewLoading || memberCountLoading}
              />
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
              <div className="mt-3.5">
                <p className="mb-1.5 text-[11px] leading-snug text-muted-foreground">
                  <span className="font-medium text-foreground/85">Task progress</span>
                  <span className="mx-1.5 text-border/70">·</span>
                  <span className="tabular-nums">{completionPercent}% completed</span>
                  <span className="mx-1 text-border/70">•</span>
                  <span className="tabular-nums">
                    {completedCount}/{totalTasks} tasks
                  </span>
                </p>
                <div className="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-muted/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500/85 to-indigo-500/85 transition-[width] duration-500 ease-out group-hover/card:from-violet-500 group-hover/card:to-indigo-500"
                    style={{ width: `${completionPercent}%` }}
                    role="progressbar"
                    aria-valuenow={completionPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${completionPercent}% completed, ${completedCount}/${totalTasks} tasks`}
                  />
                </div>
              </div>
            )}

            {showTaskAlerts ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px]">
                {overdueCount > 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      overdueIsCritical
                        ? "text-red-600/70 dark:text-red-400/65"
                        : "text-amber-700/45 dark:text-amber-500/45"
                    )}
                  >
                    <AlertCircle className="h-3 w-3 opacity-50" aria-hidden />
                    <span>{overdueCount} overdue</span>
                  </span>
                )}
                {dueTodayCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground/65">
                    <CalendarClock className="h-3 w-3 opacity-50" aria-hidden />
                    <span>{dueTodayCount} due today</span>
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-2 hidden min-h-[14px] sm:block" aria-hidden />
            )}
          </div>
        </div>

        {/* Mobile actions */}
        <div
          className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-200/60 pt-2.5 dark:border-border/50 sm:hidden"
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
