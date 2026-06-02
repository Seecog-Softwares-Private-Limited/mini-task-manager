"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchUserPlanUsage, formatBytes } from "@/services/api/user-plans.api";
import { PlanBadge } from "@/components/PlanBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, HardDrive, Users, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

function UsageBar({
  label,
  used,
  limit,
  formatValue,
  icon,
}: {
  label: string;
  used: number;
  limit: number | null;
  formatValue: (n: number) => string;
  icon: React.ReactNode;
}) {
  const pct =
    limit === null || limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const atLimit = limit !== null && used >= limit;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className={cn("font-medium", atLimit && "text-destructive")}>
          {formatValue(used)}
          {limit !== null ? ` / ${formatValue(limit)}` : " / Unlimited"}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            atLimit ? "bg-destructive" : pct > 80 ? "bg-amber-500" : "bg-primary"
          )}
          style={{ width: limit === null ? "8%" : `${Math.max(pct, 4)}%` }}
        />
      </div>
    </div>
  );
}

export function PlanUsageWidget({ className }: { className?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["user-plans", "usage"],
    queryFn: fetchUserPlanUsage,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="h-40 p-6" />
      </Card>
    );
  }

  if (!data) return null;

  const { plan, usage, planExpiresAt } = data;

  return (
    <Card className={cn("border-border/70", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Your plan</CardTitle>
        <PlanBadge plan={plan} />
      </CardHeader>
      <CardContent className="space-y-4">
        {planExpiresAt && plan !== "free" && (
          <p className="text-xs text-muted-foreground">
            Renews / expires: {new Date(planExpiresAt).toLocaleDateString()}
          </p>
        )}

        <UsageBar
          label="Workspaces"
          used={usage.workspaces.used}
          limit={usage.workspaces.limit}
          formatValue={(n) => String(n)}
          icon={<Building2 className="h-4 w-4" />}
        />
        <UsageBar
          label="Members (this workspace)"
          used={usage.members.used}
          limit={usage.members.limit}
          formatValue={(n) => String(n)}
          icon={<Users className="h-4 w-4" />}
        />
        <UsageBar
          label="Storage"
          used={usage.storage.usedBytes}
          limit={usage.storage.limitBytes}
          formatValue={formatBytes}
          icon={<HardDrive className="h-4 w-4" />}
        />

        {plan !== "gold" && (
          <Button asChild className="w-full gap-2" size="sm">
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
