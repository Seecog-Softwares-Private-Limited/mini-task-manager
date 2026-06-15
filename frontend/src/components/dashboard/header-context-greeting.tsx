"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/context/tenant-context";
import { useWorkspacePlan } from "@/hooks/use-workspace-plan";
import { planDisplayName } from "@/lib/plan-display";
import { fetchOrganizations, fetchOrgHealthData } from "@/services/api/organizations.api";
import { cn } from "@/lib/utils";
import { APP_CHIP_BASE } from "@/lib/ui/design-tokens";

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function MetricChip({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <span
      className={cn(
        APP_CHIP_BASE,
        "px-1.5 text-[10px] tabular-nums",
        warn
          ? "border-amber-200/60 bg-amber-50/50 text-amber-800/70 dark:border-amber-800/30 dark:bg-amber-950/20 dark:text-amber-300/70"
          : "border-border/50 bg-muted/30 text-muted-foreground"
      )}
    >
      {children}
    </span>
  );
}

export function HeaderContextGreeting() {
  const { user } = useAuth();
  const { orgId } = useTenant();
  const { data: planData } = useWorkspacePlan();
  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: fetchOrganizations,
  });
  const { data: health } = useQuery({
    queryKey: ["org-health", orgId ?? ""],
    queryFn: () => fetchOrgHealthData(orgId!),
    enabled: Boolean(orgId),
    staleTime: 60_000,
  });

  const { greeting, firstName, workspaceLine, metrics, contextTitle } = useMemo(() => {
    const hour = new Date().getHours();
    const name = user?.fullName?.trim();
    const first = name?.split(/\s+/)[0];
    const activeOrg = orgId ? organizations.find((o) => o.id === orgId) : organizations[0];
    const plan = planData?.plan ? planDisplayName(planData.plan) : null;

    const wsParts: string[] = [];
    if (activeOrg?.name) wsParts.push(activeOrg.name);
    if (plan) wsParts.push(`${plan} Plan`);
    const workspaceLine = wsParts.join(" · ") || null;

    let metrics: { overdue: number; dueToday: number; completion: number } | null = null;
    if (health && health.totalTasks > 0) {
      metrics = {
        overdue: health.overdueCount,
        dueToday: health.dueTodayCount,
        completion: Math.round((health.completedCount / health.totalTasks) * 100),
      };
    }

    const titleParts = [workspaceLine];
    if (metrics) {
      titleParts.push(
        `${metrics.overdue} overdue · ${metrics.dueToday} due today · ${metrics.completion}% completion`
      );
    }

    return {
      greeting: getGreeting(hour),
      firstName: first && first !== user?.email ? first : null,
      workspaceLine,
      metrics,
      contextTitle: titleParts.filter(Boolean).join(" — ") || undefined,
    };
  }, [user, orgId, organizations, planData?.plan, health]);

  return (
    <div className="hidden min-w-0 flex-1 md:block">
      <p className="truncate text-sm font-semibold tracking-tight text-foreground transition-colors duration-150">
        {greeting}
        {firstName ? `, ${firstName}` : ""}
        <span className="ml-0.5" aria-hidden>
          👋
        </span>
      </p>
      {workspaceLine ? (
        <div className="mt-0.5 space-y-1" title={contextTitle}>
          <p className="truncate text-xs text-muted-foreground/90">{workspaceLine}</p>
          {metrics && (
            <div className="flex flex-wrap items-center gap-1">
              <MetricChip warn={metrics.overdue >= 8}>
                {metrics.overdue} overdue
              </MetricChip>
              <MetricChip>{metrics.dueToday} due today</MetricChip>
              <MetricChip>{metrics.completion}% completion</MetricChip>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">Manage your workspaces</p>
      )}
    </div>
  );
}
