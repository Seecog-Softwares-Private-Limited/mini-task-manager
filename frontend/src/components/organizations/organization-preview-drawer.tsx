"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PlanBadge } from "@/components/PlanBadge";
import { WorkspaceThumb } from "@/components/workspaces/workspace-thumb";
import { cn, getInitials } from "@/lib/utils";
import {
  formatActivityHumanReadable,
  getActivityVisual,
} from "@/lib/activity-display";
import { fetchOrgMembers } from "@/services/api/members.api";
import { fetchActivityLogsByOrg } from "@/services/api/activity-logs.api";
import {
  fetchProjectsByOrg,
  fetchProjectsCountByOrg,
} from "@/services/api/projects.api";
import { fetchOrgHealthData } from "@/services/api/organizations.api";
import { fetchCurrentUserPlan } from "@/services/api/user-plans.api";
import type { Organization, OrgMember, ActivityLog } from "@/types/api";
import {
  Users,
  FolderKanban,
  Activity,
  LayoutGrid,
  Loader2,
  CalendarClock,
  CheckSquare,
  UserPlus,
  Settings,
  ChevronRight,
  CreditCard,
  Shield,
  Building2,
  type LucideIcon,
} from "lucide-react";

const PREVIEW_AVATAR_COUNT = 5;
const TAB_TRANSITION = "transition-colors duration-150";

function formatRelativeTime(input: string | undefined): string {
  if (!input) return "";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const absMs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (absMs < minute) return rtf.format(-Math.round(diffMs / 1000), "second");
  if (absMs < hour) return rtf.format(-Math.round(diffMs / minute), "minute");
  if (absMs < day) return rtf.format(-Math.round(diffMs / hour), "hour");
  if (absMs < 7 * day) return rtf.format(-Math.round(diffMs / day), "day");
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function StatCard({
  icon: Icon,
  label,
  value,
  onClick,
  highlight,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  onClick?: () => void;
  highlight?: boolean;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0 opacity-80" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground",
          highlight && "text-destructive"
        )}
      >
        {value}
      </p>
    </>
  );

  const className = cn(
    "rounded-xl border border-border/60 bg-card p-3.5 text-left shadow-sm",
    TAB_TRANSITION,
    onClick && "hover:border-primary/25 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} aria-label={`Open ${label.toLowerCase()}`}>
        {inner}
      </button>
    );
  }

  return <div className={className}>{inner}</div>;
}

function MemberAvatarStack({
  members,
  loading,
  max = PREVIEW_AVATAR_COUNT,
}: {
  members: OrgMember[];
  loading?: boolean;
  max?: number;
}) {
  if (loading) {
    return (
      <div className="flex -space-x-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-9 rounded-full ring-2 ring-background" />
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">No members yet</p>;
  }

  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center">
        <div className="flex -space-x-2">
          {visible.map((m) => (
            <Tooltip key={m.id}>
              <TooltipTrigger asChild>
                <Avatar className="h-9 w-9 cursor-default ring-2 ring-background transition-transform duration-150 hover:z-10 hover:scale-105">
                  <AvatarImage src={m.user?.avatarUrl} />
                  <AvatarFallback className="text-xs">
                    {getInitials(m.user?.fullName ?? m.user?.email ?? "?")}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-medium">{m.user?.fullName ?? m.user?.email ?? "Member"}</p>
                <p className="capitalize text-muted-foreground">{m.role.toLowerCase()}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        {overflow > 0 && (
          <span className="ml-2 text-xs font-medium text-muted-foreground">+{overflow}</span>
        )}
      </div>
    </TooltipProvider>
  );
}

function ActivityFeed({ logs, loading }: { logs: ActivityLog[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading activity…
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <p className="py-6 text-sm text-muted-foreground">No recent activity for this workspace.</p>
    );
  }

  return (
    <ul className="space-y-2" role="list">
      {logs.map((log) => {
        const visual = getActivityVisual(log);
        const Icon = visual.icon;
        return (
          <li
            key={log.id}
            className="flex items-start gap-3 rounded-xl border border-border/50 bg-card px-3 py-2.5 transition-colors duration-150 hover:bg-muted/20"
          >
            <span
              className={cn(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                visual.bgClassName
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", visual.iconClassName)} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug text-foreground">
                {formatActivityHumanReadable(log)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatRelativeTime(log.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export interface OrganizationPreviewDrawerProps {
  organization: Organization | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when user navigates - switch org first, then drawer will navigate. */
  onNavigate?: (orgId: string, path: string) => void;
  /** @deprecated Plan is resolved from user-plans API; kept for backward compatibility. */
  plans?: { id: string; name: string }[];
}

export function OrganizationPreviewDrawer({
  organization,
  open,
  onOpenChange,
  onNavigate,
}: OrganizationPreviewDrawerProps) {
  const router = useRouter();
  const orgId = organization?.id;
  const [activeTab, setActiveTab] = React.useState("overview");

  React.useEffect(() => {
    if (open) setActiveTab("overview");
  }, [open, orgId]);

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["org-members", orgId ?? ""],
    queryFn: () => fetchOrgMembers(orgId!),
    enabled: !!orgId && open,
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["activity-logs", orgId ?? "", "preview"],
    queryFn: () => fetchActivityLogsByOrg(orgId!, 1, 15),
    enabled: !!orgId && open,
  });

  const { data: projectCount } = useQuery({
    queryKey: ["projects", orgId ?? "", "count"],
    queryFn: () => fetchProjectsCountByOrg(orgId!),
    enabled: !!orgId && open,
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", orgId ?? "", "list"],
    queryFn: () => fetchProjectsByOrg(orgId!),
    enabled: !!orgId && open && activeTab === "projects",
  });

  const { data: healthData } = useQuery({
    queryKey: ["org-health", orgId ?? ""],
    queryFn: () => fetchOrgHealthData(orgId!),
    enabled: !!orgId && open,
  });

  const { data: planData } = useQuery({
    queryKey: ["user-plans", "current"],
    queryFn: fetchCurrentUserPlan,
    enabled: open,
    staleTime: 30_000,
  });

  const activityLogs = activityData?.data ?? [];
  const memberCount = members.length;
  const overdueCount = healthData?.overdueCount ?? 0;
  const totalTasks = healthData?.totalTasks ?? 0;
  const completedCount = healthData?.completedCount ?? 0;
  const completionPct =
    totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : null;
  const planSlug = planData?.plan ?? "free";

  if (!organization) return null;

  function handleNavigate(path: string) {
    if (orgId) {
      onNavigate?.(orgId, path);
      onOpenChange(false);
      router.push(path);
    }
  }

  const settingsLinks = [
    {
      href: "/dashboard/settings/workspace",
      label: "Workspace profile",
      description: "Name, logo, and general settings",
      icon: Building2,
    },
    {
      href: "/dashboard/settings/members",
      label: "Members & invites",
      description: "Manage team access and roles",
      icon: Users,
    },
    {
      href: "/dashboard/settings/permissions",
      label: "Permissions",
      description: "Role capabilities and access",
      icon: Shield,
    },
    {
      href: "/dashboard/billing",
      label: "Billing & plan",
      description: "Subscription and usage",
      icon: CreditCard,
    },
  ] as const;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        overlayClassName="bg-black/35 backdrop-blur-[2px]"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-border/60 bg-card">
            <div className="space-y-3 px-6 pb-3 pt-6 pr-12">
              <div className="flex items-start gap-3">
                <WorkspaceThumb workspace={organization} size="md" active className="h-12 w-12 text-sm" />
                <div className="min-w-0 flex-1 space-y-1">
                  <SheetTitle className="truncate text-base font-semibold leading-tight">
                    {organization.name}
                  </SheetTitle>
                  <SheetDescription className="truncate font-mono text-xs">
                    {organization.slug}
                  </SheetDescription>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <Badge
                      variant={organization.isArchived ? "statusArchived" : "statusActive"}
                      className="text-[10px]"
                    >
                      {organization.isArchived ? "Archived" : "Active"}
                    </Badge>
                    {organization.myRole && (
                      <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                        {organization.myRole.toLowerCase()}
                      </span>
                    )}
                    <PlanBadge plan={planSlug} compact showIcon />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  className="h-8 flex-1 min-w-[7rem] text-xs"
                  size="sm"
                  onClick={() => handleNavigate("/dashboard/projects")}
                >
                  <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
                  Open Workspace
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => handleNavigate("/dashboard/settings/members")}
                >
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  Invite Members
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                  onClick={() => handleNavigate("/dashboard/settings/workspace")}
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:ml-1.5">Settings</span>
                </Button>
              </div>
            </div>

            <div className="px-6 pb-3">
              <TabsList className="h-9 w-full justify-start overflow-x-auto rounded-lg bg-muted/40 p-0.5">
                {[
                  { value: "overview", label: "Overview" },
                  { value: "members", label: "Members" },
                  { value: "projects", label: "Projects" },
                  { value: "activity", label: "Activity" },
                  { value: "settings", label: "Settings" },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="h-7 shrink-0 px-3 text-xs data-[state=active]:shadow-sm"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <TabsContent value="overview" className="mt-0 space-y-5 focus-visible:outline-none">
              {completionPct !== null && totalTasks > 0 && (
                <section aria-label="Workspace progress">
                  <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Task progress
                      </h3>
                      <span className="text-sm font-bold tabular-nums text-primary">
                        {completionPct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-primary transition-all duration-200 ease-out"
                        style={{ width: `${completionPct}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {completedCount} of {totalTasks} tasks completed
                    </p>
                  </div>
                </section>
              )}

              <section aria-label="Workspace stats">
                <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Summary
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <StatCard
                    icon={Users}
                    label="Members"
                    value={membersLoading ? "…" : memberCount}
                    onClick={() => handleNavigate("/dashboard/settings/members")}
                  />
                  <StatCard
                    icon={FolderKanban}
                    label="Projects"
                    value={projectCount ?? "…"}
                    onClick={() => handleNavigate("/dashboard/projects")}
                  />
                  <StatCard
                    icon={CheckSquare}
                    label="Tasks"
                    value={totalTasks}
                    onClick={() => handleNavigate("/dashboard/tasks")}
                  />
                  <StatCard
                    icon={CalendarClock}
                    label="Overdue"
                    value={overdueCount}
                    highlight={overdueCount > 0}
                  />
                </div>
              </section>

              <section aria-label="Team preview">
                <div className="mb-2.5 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Team
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("members")}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    View all
                  </button>
                </div>
                <MemberAvatarStack members={members as OrgMember[]} loading={membersLoading} />
              </section>

              <section aria-label="Recent activity preview">
                <div className="mb-2.5 flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Activity className="h-3.5 w-3.5" />
                    Recent activity
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("activity")}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    View all
                  </button>
                </div>
                <ActivityFeed logs={activityLogs.slice(0, 4)} loading={activityLoading} />
              </section>
            </TabsContent>

            <TabsContent value="members" className="mt-0 space-y-4 focus-visible:outline-none">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {membersLoading ? "Loading…" : `${memberCount} member${memberCount === 1 ? "" : "s"}`}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => handleNavigate("/dashboard/settings/members")}
                >
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  Invite
                </Button>
              </div>

              {membersLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : members.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No members yet.</p>
              ) : (
                <ul className="space-y-1.5" role="list">
                  {(members as OrgMember[]).map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-3 py-2.5"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={m.user?.avatarUrl} />
                        <AvatarFallback className="text-xs">
                          {getInitials(m.user?.fullName ?? m.user?.email ?? "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {m.user?.fullName ?? m.user?.email ?? "Member"}
                        </p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {m.role.toLowerCase()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="projects" className="mt-0 space-y-4 focus-visible:outline-none">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {projectsLoading ? "Loading…" : `${projectCount ?? projects.length} project${(projectCount ?? projects.length) === 1 ? "" : "s"}`}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => handleNavigate("/dashboard/projects")}
                >
                  View all
                </Button>
              </div>

              {projectsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No projects yet.</p>
              ) : (
                <ul className="space-y-1.5" role="list">
                  {projects.slice(0, 12).map((project) => (
                    <li key={project.id}>
                      <button
                        type="button"
                        onClick={() => handleNavigate(`/dashboard/projects/${project.id}`)}
                        className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-card px-3 py-2.5 text-left transition-colors duration-150 hover:border-primary/25 hover:bg-muted/20"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                          <FolderKanban className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{project.name}</p>
                          {project.isArchived && (
                            <p className="text-xs text-muted-foreground">Archived</p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-0 focus-visible:outline-none">
              <ActivityFeed logs={activityLogs} loading={activityLoading} />
            </TabsContent>

            <TabsContent value="settings" className="mt-0 space-y-2 focus-visible:outline-none">
              <p className="mb-3 text-sm text-muted-foreground">
                Quick links to workspace configuration.
              </p>
              <ul className="space-y-1.5" role="list">
                {settingsLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <li key={link.href}>
                      <button
                        type="button"
                        onClick={() => handleNavigate(link.href)}
                        className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-card px-3 py-3 text-left transition-colors duration-150 hover:border-primary/25 hover:bg-muted/20"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{link.label}</p>
                          <p className="text-xs text-muted-foreground">{link.description}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
