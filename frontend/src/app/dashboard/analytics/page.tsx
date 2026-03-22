"use client";

import { useQuery } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/use-permissions";
import { useTenant } from "@/context/tenant-context";
import Link from "next/link";
import { fetchOrganizationAnalytics } from "@/services/api/analytics.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ACTIVATION_FUNNEL_STEPS } from "@/lib/analytics/events";
import { TrendingUp, Users, Zap, PieChart, BarChart3, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const KPI_DEFINITIONS: { id: string; title: string; description: string }[] = [
  { id: "activation", title: "Activation Rate", description: "Share of signups who complete workspace setup. Indicates onboarding effectiveness." },
  { id: "retention7d", title: "7-day Retention", description: "Share of orgs active in the week after first activity. Measures stickiness." },
  { id: "conversion", title: "Conversion Rate", description: "Share of upgrade clicks resulting in a paid subscription." },
  { id: "churn", title: "Churn Rate", description: "Share of paid orgs that cancel in a given period. Lower is better." },
];

export default function AnalyticsPage() {
  const { canViewAnalytics } = usePermissions();
  const { orgId } = useTenant();

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ["analytics", orgId ?? ""],
    queryFn: fetchOrganizationAnalytics,
    enabled: !!orgId && canViewAnalytics,
    staleTime: 60 * 1000,
  });

  if (!canViewAnalytics) {
    return (
      <div className="space-y-4 animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <Card className="max-w-md border-dashed border-2">
          <CardContent className="flex items-center gap-4 py-8 px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 shrink-0">
              <Shield className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold">Access Restricted</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Only owners and admins can view analytics.</p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href="/dashboard">Back to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="space-y-4 animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <Card className="max-w-md border-dashed border-2">
          <CardContent className="flex items-center gap-4 py-8 px-6">
            <p className="text-sm text-muted-foreground">Select a workspace to view analytics.</p>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/workspaces">Workspaces</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !analytics) {
    return (
      <div className="space-y-8 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Growth &amp; Analytics</h1>
          <p className="mt-1 text-muted-foreground">Product intelligence and health indicators.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <Card className="max-w-md border-dashed border-2 border-destructive/30">
          <CardContent className="flex flex-col gap-4 py-8 px-6">
            <p className="text-sm text-muted-foreground">Failed to load analytics. Please try again.</p>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const trialLabel = analytics.trialConversionPct !== null ? `${analytics.trialConversionPct}%` : "—";
  const totalFromPlans = analytics.planDistribution.reduce((a, p) => a + p.count, 0);

  return (
    <div className="space-y-8 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Growth &amp; Analytics</h1>
        <p className="mt-1 text-muted-foreground">Product intelligence and health indicators.</p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Activation Rate", value: `${analytics.activationRate}%`, sub: "Members who created a project", icon: Zap, color: "text-primary bg-primary/10" },
          { label: "Trial to Paid", value: trialLabel, sub: "Conversion status", icon: TrendingUp, color: "text-emerald-500 bg-emerald-500/10" },
          { label: "Active Members (7d)", value: String(analytics.activeMembers7d), sub: "Weekly active", icon: Users, color: "text-blue-500 bg-blue-500/10" },
          { label: "Total Members", value: String(analytics.totalMembers), sub: "In this workspace", icon: PieChart, color: "text-purple-500 bg-purple-500/10" },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-current/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", kpi.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-4 text-3xl font-bold">{kpi.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{kpi.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Activation funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Activation Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ACTIVATION_FUNNEL_STEPS.map((step, i) => {
              const count = analytics.funnelCounts[step] ?? 0;
              const maxCount = Math.max(analytics.funnelCounts.signup, 1);
              const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
              return (
                <div key={step} className="flex items-center gap-4 rounded-xl border p-4 hover:bg-muted/20 transition-colors">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium capitalize">{step.replace(/_/g, " ")}</span>
                      <span className="text-sm font-semibold">{count}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full gradient-bg transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Workspace summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Workspace Summary</CardTitle>
          <p className="text-sm text-muted-foreground">Projects and tasks in this workspace.</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-2xl font-bold">{analytics.totalProjects}</p>
              <p className="text-sm text-muted-foreground">Projects</p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-2xl font-bold">{analytics.totalTasks}</p>
              <p className="text-sm text-muted-foreground">Tasks</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current plan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Plan</CardTitle>
          <p className="text-sm text-muted-foreground">Subscription status: {analytics.subscriptionStatus}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.planDistribution.map((p) => {
              const total = totalFromPlans;
              const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
              return (
                <div key={p.plan} className="flex items-center gap-3">
                  <span className={cn("h-3 w-3 rounded-full", p.color)} />
                  <span className="text-sm font-medium w-16">{p.plan}</span>
                  <div className="flex-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full transition-all", p.color)} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-semibold w-12 text-right">{p.count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* KPI definitions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Health Indicator Definitions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {KPI_DEFINITIONS.map((kpi) => (
            <div key={kpi.id} className="rounded-xl border bg-muted/20 p-4">
              <p className="font-semibold text-sm">{kpi.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{kpi.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
