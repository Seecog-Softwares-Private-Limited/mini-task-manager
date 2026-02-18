"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/context/tenant-context";
import { usePlan } from "@/context/plan-context";
import { useUpgradeModal } from "@/context/upgrade-modal-context";
import { fetchInvoices } from "@/services/api/billing.api";
import { fetchProjects } from "@/services/api/projects.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UsageMeter } from "@/components/usage-meter";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { CreditCard, Zap, ArrowRight, Calendar, FileText, AlertTriangle, X, Sparkles, Shield, Building2 } from "lucide-react";

export default function BillingPage() {
  const { canManageBilling } = useAuth();
  const { orgId } = useTenant();
  const { subscription, plan, plans, isTrial, trialEndsAt } = usePlan();
  const { openUpgradeModal } = useUpgradeModal();
  const [planComparisonOpen, setPlanComparisonOpen] = useState(false);

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["billing", "invoices", orgId ?? ""],
    queryFn: fetchInvoices,
    enabled: !!orgId && canManageBilling,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId ?? ""],
    queryFn: fetchProjects,
    enabled: !!orgId && canManageBilling,
  });

  const projectCount = projects.length;
  const memberCount = 0;

  if (!canManageBilling) {
    return (
      <div className="space-y-4 animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <Card className="max-w-md border-dashed border-2">
          <CardContent className="flex items-center gap-4 py-8 px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 shrink-0">
              <Shield className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold">Access Restricted</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Only organization owners and admins can manage billing.</p>
              <Button asChild size="sm" className="mt-3" variant="outline">
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
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <Card className="max-w-md border-dashed border-2">
          <CardContent className="flex items-center gap-4 py-8 px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Select an Organization</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Choose an organization to view billing.</p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/dashboard/organizations">Organizations</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cycleStart = subscription?.startDate
    ? new Date(subscription.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "—";
  const cycleEnd = subscription?.endDate
    ? new Date(subscription.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your subscription and usage</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPlanComparisonOpen(true)}>
            Compare Plans
          </Button>
          <Button size="sm" onClick={() => openUpgradeModal("general")}>
            <Zap className="mr-1 h-4 w-4" /> Upgrade
          </Button>
        </div>
      </div>

      {/* Current plan */}
      <Card className="overflow-hidden">
        <div className="h-1.5 gradient-bg" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {plan ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold">{plan.name}</span>
                  {isTrial && (
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600">
                      Trial
                    </span>
                  )}
                </div>
                {isTrial && trialEndsAt && (
                  <span className="text-sm text-muted-foreground">
                    Ends {trialEndsAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {plan.pricePerUser != null && Number(plan.pricePerUser) > 0
                  ? `$${plan.pricePerUser}/user per ${plan.billingCycle}`
                  : plan.billingCycle}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <UsageMeter
                  label="Projects"
                  current={projectCount}
                  limit={plan.maxProjects ?? null}
                  subLabel={`${projectCount}${plan.maxProjects != null ? ` of ${plan.maxProjects}` : ""}`}
                />
                <UsageMeter
                  label="Members"
                  current={memberCount}
                  limit={plan.maxMembers ?? null}
                  subLabel={`${memberCount}${plan.maxMembers != null ? ` of ${plan.maxMembers}` : ""}`}
                />
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">No active subscription. Select a plan below.</p>
          )}
        </CardContent>
      </Card>

      {/* Billing cycle */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Billing Cycle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
              <span className="text-sm text-muted-foreground">Period</span>
              <span className="text-sm font-medium">{cycleStart} – {cycleEnd}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                subscription.status?.toUpperCase() === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
              )}>
                {subscription.status}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Invoice History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : invoices.length === 0 ? (
            <EmptyState
              title="No invoices yet"
              description="Invoices will appear here once you have a paid subscription."
              icon={<FileText className="h-12 w-12" />}
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(inv.issuedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-semibold">${inv.amount}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{inv.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      {subscription && subscription.status?.toUpperCase() !== "CANCELLED" && (
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Cancel your subscription. You will lose access at the end of the current billing period.
            </p>
            <Button variant="destructive" size="sm" className="mt-3" disabled>
              Cancel Subscription (contact support)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Plan comparison modal */}
      {planComparisonOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="plan-comparison-title"
        >
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-premium-lg animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 id="plan-comparison-title" className="text-lg font-bold">Compare Plans</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPlanComparisonOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {plans.map((p) => (
                <div key={p.id} className={cn(
                  "rounded-xl border p-4 transition-all",
                  plan?.id === p.id && "border-primary/30 bg-primary/5 ring-1 ring-primary/20"
                )}>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{p.name}</p>
                    {plan?.id === p.id && (
                      <span className="rounded-full gradient-bg px-2.5 py-0.5 text-[10px] font-bold text-white">Current</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {p.pricePerUser != null && Number(p.pricePerUser) > 0
                      ? `$${p.pricePerUser}/user · ${p.billingCycle}`
                      : p.billingCycle}
                    {p.maxProjects != null && ` · ${p.maxProjects} projects`}
                    {p.maxMembers != null && ` · ${p.maxMembers} members`}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => setPlanComparisonOpen(false)} variant="outline">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
