"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/context/tenant-context";
import { usePlan } from "@/context/plan-context";
import { useOrgRole } from "@/hooks/use-org-role";
import {
  fetchInvoices,
  cancelSubscription,
  downgradeToFree,
} from "@/services/api/billing.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UsageMeter } from "@/components/usage-meter";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import {
  CreditCard, Zap, ArrowRight, Calendar, FileText,
  AlertTriangle, Shield, Building2, Crown,
  Sparkles, Clock, ReceiptText,
} from "lucide-react";

export default function BillingPage() {
  const router = useRouter();
  const { canManageBilling, isLoading: roleLoading } = useOrgRole();
  const { orgId } = useTenant();
  const {
    subscription,
    plan,
    usage,
    isTrial,
    isTrialExpired,
    trialEndsAt,
    refetch,
  } = usePlan();

  const [cancelling, setCancelling] = useState(false);
  const [downgrading, setDowngrading] = useState(false);
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["billing", "invoices", orgId ?? ""],
    queryFn: fetchInvoices,
    enabled: !!orgId && canManageBilling,
  });

  if (roleLoading) {
    return (
      <div className="space-y-4 animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

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

  const status = subscription?.status?.toUpperCase() ?? "—";
  const isActive = status === "ACTIVE";
  const isTrialStatus = status === "TRIAL";
  const isFree = plan?.slug === "free";
  const isPaid = plan && !isFree && isActive;

  async function handleCancel() {
    if (!confirm("Are you sure? You will be downgraded to the Free plan immediately.")) return;
    setCancelling(true);
    try {
      const updatedSub = await cancelSubscription("User requested cancellation");
      if (orgId) {
        queryClient.setQueryData(["billing", "subscription", orgId], updatedSub);
      }
      await queryClient.invalidateQueries({ queryKey: ["billing"] });
      await refetch();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to cancel subscription");
    }
    setCancelling(false);
  }

  async function handleDowngrade() {
    if (!confirm("Are you sure you want to downgrade to the Free plan? You will lose access to paid features immediately.")) return;
    setDowngrading(true);
    try {
      const updatedSub = await downgradeToFree();
      if (orgId) {
        queryClient.setQueryData(["billing", "subscription", orgId], updatedSub);
      }
      await queryClient.invalidateQueries({ queryKey: ["billing"] });
      await refetch();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to downgrade");
    }
    setDowngrading(false);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing &amp; Subscription</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your plan, usage, and invoices</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/plans">
              <Sparkles className="mr-1 h-4 w-4" /> View Plans
            </Link>
          </Button>
          {(isFree || isTrialExpired) && (
            <Button size="sm" asChild>
              <Link href="/dashboard/plans">
                <Zap className="mr-1 h-4 w-4" /> Upgrade
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Trial expiry warning */}
      {isTrialExpired && (
        <div className="animate-fade-in rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-5 flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50 shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-800 dark:text-amber-200">Your Pro trial has expired</p>
            <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-300">
              You&apos;ve been downgraded to the Free plan. Upgrade to Pro or Enterprise to regain access to premium features.
            </p>
          </div>
          <Button size="sm" asChild className="shrink-0">
            <Link href="/dashboard/plans">Upgrade Now</Link>
          </Button>
        </div>
      )}

      {/* Active trial banner */}
      {isTrial && !isTrialExpired && trialEndsAt && (
        <div className="animate-fade-in rounded-xl border-2 border-purple-200 dark:border-purple-700 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 p-5 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/50 shrink-0">
            <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-purple-800 dark:text-purple-200">Pro Trial Active</p>
            <p className="mt-0.5 text-sm text-purple-700 dark:text-purple-300">
              Your trial ends on {trialEndsAt.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}.
              {subscription?.daysRemaining != null && ` ${subscription.daysRemaining} days remaining.`}
            </p>
          </div>
          <Button size="sm" variant="outline" asChild className="shrink-0 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300">
            <Link href="/dashboard/plans">Subscribe Now</Link>
          </Button>
        </div>
      )}

      {/* Current Plan Card */}
      <Card className="overflow-hidden shadow-lg">
        <div className={cn(
          "h-1.5",
          plan?.slug === "enterprise" ? "bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" :
          plan?.slug === "pro" ? "bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600" :
          "bg-gradient-to-r from-slate-400 to-slate-600"
        )} />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {plan ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg",
                    plan.slug === "enterprise" ? "bg-gradient-to-br from-amber-500 to-orange-600"
                    : plan.slug === "pro" ? "bg-gradient-to-br from-violet-600 to-indigo-600"
                    : "bg-gradient-to-br from-slate-500 to-slate-700"
                  )}>
                    {plan.slug === "enterprise" ? <Crown className="h-6 w-6" /> :
                     plan.slug === "pro" ? <Zap className="h-6 w-6" /> :
                     <Shield className="h-6 w-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold">{plan.name}</span>
                      {isTrial && !isTrialExpired && (
                        <span className="rounded-full bg-purple-100 dark:bg-purple-900/50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
                          TRIAL
                        </span>
                      )}
                      {isActive && !isTrial && (
                        <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isFree ? "Free forever" :
                       subscription?.billingCycle === "yearly"
                        ? `₹${plan.priceYearly}/user/year`
                        : `₹${plan.priceMonthly}/user/month`}
                    </p>
                  </div>
                </div>
                {!isFree && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/plans">
                      Change Plan <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No active subscription.</p>
              <Button size="sm" className="mt-3" asChild>
                <Link href="/dashboard/plans">Choose a Plan</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Meters */}
      {usage && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ReceiptText className="h-5 w-5 text-primary" />
              Resource Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <UsageMeter
                label="Team Members"
                current={usage.users.current}
                limit={usage.users.limit}
                subLabel={`${usage.users.current}${usage.users.limit != null ? ` of ${usage.users.limit}` : " (Unlimited)"}`}
                className="border-0 bg-blue-50/50 dark:bg-blue-950/20"
              />
              <UsageMeter
                label="Projects"
                current={usage.projects.current}
                limit={usage.projects.limit}
                subLabel={`${usage.projects.current}${usage.projects.limit != null ? ` of ${usage.projects.limit}` : " (Unlimited)"}`}
                className="border-0 bg-violet-50/50 dark:bg-violet-950/20"
              />
              <UsageMeter
                label="Storage (GB)"
                current={usage.storageGb.current}
                limit={usage.storageGb.limit}
                subLabel={`${usage.storageGb.current} GB${usage.storageGb.limit != null ? ` of ${usage.storageGb.limit} GB` : " (Unlimited)"}`}
                className="border-0 bg-emerald-50/50 dark:bg-emerald-950/20"
              />
              <UsageMeter
                label="Automations"
                current={usage.automations.current}
                limit={usage.automations.limit}
                subLabel={`${usage.automations.current}${usage.automations.limit != null ? ` of ${usage.automations.limit}/mo` : " (Unlimited)"}`}
                className="border-0 bg-amber-50/50 dark:bg-amber-950/20"
              />
              <UsageMeter
                label="Integrations"
                current={usage.integrations.current}
                limit={usage.integrations.limit}
                subLabel={`${usage.integrations.current}${usage.integrations.limit != null ? ` of ${usage.integrations.limit}` : " (Unlimited)"}`}
                className="border-0 bg-rose-50/50 dark:bg-rose-950/20"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Cycle */}
      {subscription && (isActive || isTrialStatus) && (
        <Card className="shadow-lg">
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
              <span className="text-sm text-muted-foreground">Billing</span>
              <span className="text-sm font-medium capitalize">{subscription.billingCycle || "—"}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                isActive ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400"
                : isTrialStatus ? "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400"
                : "bg-muted text-muted-foreground"
              )}>
                {subscription.status}
              </span>
            </div>
            {subscription.razorpaySubscriptionId && (
              <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                <span className="text-sm text-muted-foreground">Razorpay ID</span>
                <span className="text-sm font-mono text-muted-foreground">{subscription.razorpaySubscriptionId}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invoice History */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Invoice History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
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
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Plan</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Cycle</th>
                    <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(inv.issuedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 font-medium">{inv.planName}</td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{inv.billingCycle}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {inv.currency === "INR" ? "₹" : "$"}{inv.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          inv.status?.toUpperCase() === "PAID"
                            ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {subscription && !isFree && status !== "CANCELLED" && (
        <Card className="border-destructive/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isPaid && (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-destructive/10 bg-destructive/5 p-4">
                <div>
                  <p className="font-semibold text-sm">Cancel Subscription</p>
                  <p className="text-sm text-muted-foreground">
                    Your plan will remain active until the end of the current billing period.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={cancelling}
                  onClick={handleCancel}
                >
                  {cancelling ? "Cancelling..." : "Cancel Subscription"}
                </Button>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-destructive/10 bg-destructive/5 p-4">
              <div>
                <p className="font-semibold text-sm">Downgrade to Free</p>
                <p className="text-sm text-muted-foreground">
                  Immediately switch to the Free plan. You will lose access to premium features.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={downgrading}
                onClick={handleDowngrade}
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                {downgrading ? "Downgrading..." : "Downgrade"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
