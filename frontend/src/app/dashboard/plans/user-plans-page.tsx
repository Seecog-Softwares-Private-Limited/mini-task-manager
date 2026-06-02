"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { PlanUsageWidget } from "@/components/PlanUsageWidget";
import { PlanBadge } from "@/components/PlanBadge";
import {
  fetchCurrentUserPlan,
  fetchUserPlans,
  formatBytes,
  type UserPlanSlug,
  upgradeUserPlan,
} from "@/services/api/user-plans.api";
import { Check, Crown, HardDrive, Users, Building2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type PlanAccent = {
  gradient: string;
  border: string;
  badge: string;
  button: string;
};

const ACCENTS: Record<UserPlanSlug, PlanAccent> = {
  free: {
    gradient: "from-slate-500 to-slate-700",
    border: "border-slate-200/70 dark:border-slate-700/70",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    button: "bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700",
  },
  silver: {
    gradient: "from-slate-300 via-slate-200 to-slate-300",
    border: "border-slate-300/70 dark:border-slate-500/70",
    badge: "bg-gradient-to-r from-slate-200 to-slate-300 text-slate-900 dark:text-white",
    button: "bg-gradient-to-r from-slate-500 to-slate-300 text-slate-950 hover:brightness-110",
  },
  gold: {
    gradient: "from-amber-400 via-amber-300 to-yellow-400",
    border: "border-amber-400/60 dark:border-amber-600/60",
    badge: "bg-amber-100 text-amber-950 dark:bg-amber-950/30 dark:text-amber-200",
    button: "bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 hover:brightness-110",
  },
};

function toMaxText(n: number | null): string {
  if (n === null) return "Unlimited";
  return String(n);
}

function canUpgradeTo(current: UserPlanSlug | null | undefined, target: UserPlanSlug) {
  if (!current) return target !== "free";
  if (current === "gold") return false;
  if (target === "free") return false;
  if (current === "silver") return target === "gold";
  if (current === "free") return target === "silver" || target === "gold";
  return false;
}

function planIcon(plan: UserPlanSlug) {
  switch (plan) {
    case "free":
      return <Sparkles className="h-6 w-6" />;
    case "silver":
      return <Crown className="h-6 w-6" />;
    case "gold":
      return <Crown className="h-6 w-6" />;
  }
}

export default function UserPlansPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["user-plans", "list"],
    queryFn: fetchUserPlans,
    staleTime: 30_000,
  });

  const { data: current, isLoading: currentLoading } = useQuery({
    queryKey: ["user-plans", "current"],
    queryFn: fetchCurrentUserPlan,
    staleTime: 30_000,
  });

  const currentPlan: UserPlanSlug | null | undefined = current?.plan;
  const [upgrading, setUpgrading] = useState<UserPlanSlug | null>(null);

  const paymentId = searchParams.get("payment") ?? undefined;
  const paymentPlanParam = searchParams.get("plan") ?? undefined;
  const paymentPlan = useMemo<UserPlanSlug | null>(() => {
    if (!paymentPlanParam) return null;
    if (paymentPlanParam === "free" || paymentPlanParam === "silver" || paymentPlanParam === "gold") {
      return paymentPlanParam;
    }
    return null;
  }, [paymentPlanParam]);

  // Handles the placeholder gatewayUrl returned by backend:
  //   /dashboard/plans?payment=<paymentId>&plan=<plan>
  useEffect(() => {
    if (!paymentId || !paymentPlan) return;
    let cancelled = false;

    (async () => {
      setUpgrading(paymentPlan);
      try {
        const verified = await upgradeUserPlan(paymentPlan, paymentId);
        if (cancelled) return;
        if (verified.plan) {
          toast({
            title: "Plan upgraded",
            description: `You are now on the ${verified.plan.charAt(0).toUpperCase() + verified.plan.slice(1)} plan.`,
            variant: "success",
          });
          await queryClient.invalidateQueries({ queryKey: ["user-plans"] });
        } else {
          toast({
            title: "Payment not verified",
            description: "Your payment could not be verified. Please try upgrading again.",
            variant: "error",
          });
        }
      } catch (e) {
        if (cancelled) return;
        toast({
          title: "Upgrade failed",
          description: e instanceof Error ? e.message : "Could not verify payment",
          variant: "error",
        });
      } finally {
        if (cancelled) return;
        setUpgrading(null);
        router.replace("/dashboard/plans");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paymentId, paymentPlan, queryClient, router, toast]);

  const upgradeButtonText = (target: UserPlanSlug) => {
    if (currentPlan === target) return "Current plan";
    return `Upgrade to ${target.charAt(0).toUpperCase() + target.slice(1)}`;
  };

  const onUpgrade = async (target: UserPlanSlug) => {
    setUpgrading(target);
    try {
      const init = await upgradeUserPlan(target);
      if (init.requiresPayment && init.payment?.gatewayUrl) {
        // Redirect to the placeholder gatewayUrl (backend returns a callback URL).
        window.location.href = init.payment.gatewayUrl;
        return;
      }
      toast({
        title: "Plan upgraded",
        variant: "success",
        description: init.plan ? `You're now on the ${init.plan}` : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["user-plans"] });
    } catch (e) {
      toast({
        title: "Upgrade failed",
        description: e instanceof Error ? e.message : "Could not upgrade plan",
        variant: "error",
      });
    } finally {
      setUpgrading(null);
    }
  };

  const plansList = plans ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-10 pt-6">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text">
          Plans that scale with you
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Transparent pricing for your account limits: Free, Silver, and Gold.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px] items-start">
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3 items-start">
            {plansLoading ? (
              <div className="md:col-span-3 text-center text-muted-foreground">Loading plans…</div>
            ) : (
              plansList.map((plan) => {
                const accent = ACCENTS[plan.slug as UserPlanSlug] ?? ACCENTS.free;
                const currentBadge =
                  currentPlan && plan.slug === currentPlan ? (
                    <span className={cn("text-xs font-bold uppercase", accent.badge)}>Current</span>
                  ) : null;
                const canUpgrade = canUpgradeTo(currentPlan, plan.slug as UserPlanSlug);
                const isUpgrading = upgrading === plan.slug;

                return (
                  <Card
                    key={plan.slug}
                    className={cn(
                      "relative overflow-hidden transition-shadow hover:shadow-lg",
                      accent.border,
                      plan.slug === "silver" && "shadow-md"
                    )}
                  >
                    <div className={cn("h-1.5 w-full bg-gradient-to-r", accent.gradient)} />

                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50">
                            {planIcon(plan.slug as UserPlanSlug)}
                          </div>
                          <div>
                            <CardTitle className="text-xl">{plan.name}</CardTitle>
                            {currentBadge ? <div className="mt-1">{currentBadge}</div> : null}
                          </div>
                        </div>
                        {plan.slug !== "free" ? (
                          <PlanBadge plan={plan.slug as UserPlanSlug} className="hidden" />
                        ) : null}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div>
                        {plan.price === 0 ? (
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-extrabold">₹0</span>
                            <span className="text-muted-foreground">/forever</span>
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-extrabold">₹{plan.price}</span>
                            <span className="text-muted-foreground">/mo</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            Workspaces
                          </span>
                          <span className="font-semibold">{plan.limits.maxWorkspaces}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            Members / workspace
                          </span>
                          <span className="font-semibold">{toMaxText(plan.limits.maxMembersPerWorkspace)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <HardDrive className="h-4 w-4" />
                            Storage
                          </span>
                          <span className="font-semibold">{formatBytes(plan.limits.storageBytes)}</span>
                        </div>
                      </div>

                      <ul className="space-y-1.5 text-sm">
                        {plan.benefits.slice(0, 5).map((b) => (
                          <li key={b} className="flex items-start gap-2">
                            <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        className={cn(
                          "w-full",
                          plan.slug === "free"
                            ? "cursor-not-allowed"
                            : canUpgrade
                              ? accent.button
                              : "cursor-not-allowed bg-muted"
                        )}
                        disabled={plan.slug === "free" || !canUpgrade || isUpgrading}
                        onClick={() => void onUpgrade(plan.slug as UserPlanSlug)}
                      >
                        {plan.slug === currentPlan
                          ? "Current plan"
                          : canUpgrade
                            ? isUpgrading
                              ? "Upgrading…"
                              : upgradeButtonText(plan.slug as UserPlanSlug)
                            : "Not available"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        <div className="sticky top-6">
          <PlanUsageWidget />
        </div>
      </div>
    </div>
  );
}

