"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/context/tenant-context";
import { fetchOrganizations } from "@/services/api/organizations.api";
import { useWorkspacePlan } from "@/hooks/use-workspace-plan";
import {
  formatMembersUsage,
  formatRenewalDate,
  formatStorageUsage,
  formatWorkspacesUsage,
  getFriendlyUsageMessage,
  getRenewalStatus,
} from "@/lib/plan-display";
import { PlanBadge } from "@/components/PlanBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, HardDrive, Users, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

function UsageRow({
  label,
  detail,
  pct,
  icon,
}: {
  label: string;
  detail: string;
  pct: number;
  icon: React.ReactNode;
}) {
  const atLimit = pct >= 100;
  const nearLimit = pct >= 80 && pct < 100;

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span
          className={cn(
            "text-right text-xs font-medium leading-snug text-foreground",
            atLimit && "text-destructive"
          )}
        >
          {detail}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            atLimit ? "bg-destructive/90" : nearLimit ? "bg-amber-500/80" : "bg-primary/70"
          )}
          style={{ width: `${Math.max(Math.min(pct, 100), pct > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  );
}

export function PlanUsageWidget({ className }: { className?: string }) {
  const { orgId } = useTenant();
  const { data, isLoading } = useWorkspacePlan();
  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: fetchOrganizations,
  });

  const workspaceName = orgId
    ? organizations.find((o) => o.id === orgId)?.name
    : organizations[0]?.name;

  if (isLoading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="h-48 p-6" />
      </Card>
    );
  }

  if (!data) return null;

  const { plan, usage, planExpiresAt } = data;
  const renewalStatus = getRenewalStatus(planExpiresAt, plan);

  const workspacePct =
    usage.workspaces.limit && usage.workspaces.limit > 0
      ? Math.round((usage.workspaces.used / usage.workspaces.limit) * 100)
      : 0;
  const membersPct =
    usage.members.limit && usage.members.limit > 0
      ? Math.round((usage.members.used / usage.members.limit) * 100)
      : 0;
  const storagePct =
    usage.storage.limitBytes > 0
      ? Math.round((usage.storage.usedBytes / usage.storage.limitBytes) * 100)
      : 0;

  return (
    <Card className={cn("border-border/70 shadow-sm transition-shadow duration-200 hover:shadow-md", className)}>
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <CardTitle className="text-base font-semibold">Current workspace plan</CardTitle>
            {workspaceName && (
              <p className="truncate text-xs text-muted-foreground">{workspaceName}</p>
            )}
          </div>
          <PlanBadge plan={plan} showIcon />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {getFriendlyUsageMessage(plan, usage)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {planExpiresAt && plan !== "free" && renewalStatus !== "none" && (
          <p
            className={cn(
              "text-xs",
              renewalStatus === "expiring_soon"
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
            )}
          >
            Renews on {formatRenewalDate(planExpiresAt)}
          </p>
        )}

        <UsageRow
          label="Workspaces"
          detail={formatWorkspacesUsage(usage.workspaces.used, usage.workspaces.limit)}
          pct={workspacePct}
          icon={<Building2 className="h-4 w-4 shrink-0" />}
        />
        <UsageRow
          label="Members"
          detail={formatMembersUsage(usage.members.used)}
          pct={membersPct}
          icon={<Users className="h-4 w-4 shrink-0" />}
        />
        <UsageRow
          label="Storage"
          detail={formatStorageUsage(usage.storage.usedBytes, usage.storage.limitBytes)}
          pct={storagePct}
          icon={<HardDrive className="h-4 w-4 shrink-0" />}
        />

        {plan !== "gold" && (
          <Button asChild className="w-full gap-2" size="sm" variant="secondary">
            <Link href="/dashboard/plans">
              <Crown className="h-4 w-4" />
              Upgrade plan
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
