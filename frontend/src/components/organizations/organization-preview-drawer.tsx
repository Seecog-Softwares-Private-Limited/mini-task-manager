"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, getInitials } from "@/lib/utils";
import { fetchOrgMembers } from "@/services/api/members.api";
import { fetchActivityLogsByOrg } from "@/services/api/activity-logs.api";
import { fetchProjectsCountByOrg } from "@/services/api/projects.api";
import { fetchOrgHealthData } from "@/services/api/organizations.api";
import { fetchSubscriptionByOrg } from "@/services/api/billing.api";
import type { Organization, OrgMember, ActivityLog } from "@/types/api";
import {
  Building2,
  Users,
  FolderKanban,
  Activity,
  LayoutGrid,
  Loader2,
  CalendarClock,
  CheckSquare,
} from "lucide-react";

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

export interface OrganizationPreviewDrawerProps {
  organization: Organization | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when user navigates - switch org first, then drawer will navigate. */
  onNavigate?: (orgId: string, path: string) => void;
  /** Plans for resolving subscription plan name. */
  plans?: { id: string; name: string }[];
}

export function OrganizationPreviewDrawer({
  organization,
  open,
  onOpenChange,
  onNavigate,
  plans = [],
}: OrganizationPreviewDrawerProps) {
  const router = useRouter();
  const orgId = organization?.id;

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["org-members", orgId ?? ""],
    queryFn: () => fetchOrgMembers(orgId!),
    enabled: !!orgId && open,
  });

  const { data: activityData } = useQuery({
    queryKey: ["activity-logs", orgId ?? "", "preview"],
    queryFn: () => fetchActivityLogsByOrg(orgId!, 1, 15),
    enabled: !!orgId && open,
  });

  const { data: projectCount } = useQuery({
    queryKey: ["projects", orgId ?? "", "count"],
    queryFn: () => fetchProjectsCountByOrg(orgId!),
    enabled: !!orgId && open,
  });

  const { data: healthData } = useQuery({
    queryKey: ["org-health", orgId ?? ""],
    queryFn: () => fetchOrgHealthData(orgId!),
    enabled: !!orgId && open,
  });

  const { data: subscription } = useQuery({
    queryKey: ["billing", "subscription", orgId ?? ""],
    queryFn: () => fetchSubscriptionByOrg(orgId!),
    enabled: !!orgId && open,
  });

  const activityLogs = activityData?.data ?? [];
  const memberCount = members.length;
  const overdueCount = healthData?.overdueCount ?? 0;
  const totalTasks = healthData?.totalTasks ?? 0;
  const plan = subscription?.planId
    ? plans.find((p) => p.id === subscription.planId)
    : null;
  const planName = plan?.name ?? "Free";

  if (!organization) return null;

  function handleNavigate(path: string) {
    if (orgId) {
      onNavigate?.(orgId, path);
      onOpenChange(false);
      router.push(path);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-hidden sm:max-w-md"
      >
        <SheetHeader className="flex-shrink-0 space-y-1">
          <div className="flex items-center gap-3 pr-8">
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl",
                organization.logoUrl ? "" : "bg-primary/10"
              )}
            >
              {organization.logoUrl ? (
                <img
                  src={organization.logoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-lg">{organization.name}</SheetTitle>
              <SheetDescription className="truncate">
                {organization.slug}
              </SheetDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge
              variant={organization.isArchived ? "statusArchived" : "statusActive"}
            >
              {organization.isArchived ? "Archived" : "Active"}
            </Badge>
            {organization.myRole && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">
                {organization.myRole.toLowerCase()}
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {planName}
            </span>
          </div>
        </SheetHeader>

        <div className="mt-4 flex-1 space-y-6 overflow-y-auto pr-2">
          {/* Quick navigation */}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              size="sm"
              onClick={() => handleNavigate("/dashboard/projects")}
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              Open dashboard
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigate("/dashboard/settings")}
            >
              Settings
            </Button>
          </div>

          {/* Summary stats */}
          <section aria-label="Workspace stats">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Summary
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleNavigate("/dashboard/settings/members")}
                className="rounded-lg border bg-muted/30 p-3 text-left transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                aria-label="Open workspace members"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="text-xs">Members</span>
                </div>
                <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                  {membersLoading ? "…" : memberCount}
                </p>
              </button>
              <button
                type="button"
                onClick={() => handleNavigate("/dashboard/projects")}
                className="rounded-lg border bg-muted/30 p-3 text-left transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                aria-label="Open workspace projects"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FolderKanban className="h-4 w-4" />
                  <span className="text-xs">Projects</span>
                </div>
                <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                  {projectCount ?? "…"}
                </p>
              </button>
              <button
                type="button"
                onClick={() => handleNavigate("/dashboard/tasks")}
                className="rounded-lg border bg-muted/30 p-3 text-left transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                aria-label="Open workspace tasks"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckSquare className="h-4 w-4" />
                  <span className="text-xs">Tasks</span>
                </div>
                <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                  {totalTasks}
                </p>
              </button>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />
                  <span className="text-xs">Overdue</span>
                </div>
                <p
                  className={cn(
                    "mt-1 text-xl font-bold tabular-nums",
                    overdueCount > 0 && "text-destructive"
                  )}
                >
                  {overdueCount}
                </p>
              </div>
            </div>
          </section>

          {/* Members */}
          <section aria-label="Workspace members">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Members
            </h3>
            {membersLoading ? (
              <div className="flex gap-2">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-9 w-9 rounded-full" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members yet</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(members as OrgMember[]).slice(0, 8).map((m) => (
                  <Avatar
                    key={m.id}
                    className="h-9 w-9 ring-2 ring-background"
                    title={m.user?.fullName ?? m.user?.email}
                  >
                    <AvatarImage src={m.user?.avatarUrl} />
                    <AvatarFallback className="text-xs">
                      {getInitials(m.user?.fullName ?? m.user?.email ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {members.length > 8 && (
                  <span className="self-center text-xs text-muted-foreground">
                    +{members.length - 8} more
                  </span>
                )}
              </div>
            )}
          </section>

          {/* Recent activity */}
          <section aria-label="Recent activity">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              Recent activity
            </h3>
            {!activityData ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : activityLogs.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No recent activity for this workspace.
              </p>
            ) : (
              <ul className="space-y-2" role="list">
                {activityLogs.slice(0, 8).map((log: ActivityLog) => (
                  <li
                    key={log.id}
                    className="flex items-start gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm text-muted-foreground"
                  >
                    <Activity className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span>
                        {log.action}
                        {log.metadata &&
                          typeof log.metadata === "object" &&
                          "details" in log.metadata
                          ? ` — ${String((log.metadata as { details?: string }).details ?? "")}`
                          : ""}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground/80">
                        {formatRelativeTime(log.createdAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
