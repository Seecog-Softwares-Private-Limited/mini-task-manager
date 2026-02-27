"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/context/tenant-context";
import { fetchPlans, fetchSubscriptionByOrg, fetchUsage } from "@/services/api/billing.api";
import type { Plan, Subscription, UsageData } from "@/types/api";

export type PlanLimits = {
  maxUsers: number | null;
  maxProjects: number | null;
  storageLimitGb: number | null;
  automationLimit: number | null;
  integrationLimit: number | null;
  maxApiKeys: number | null;
};

export type PlanContextValue = {
  subscription: Subscription | null;
  plan: Plan | null;
  plans: Plan[];
  limits: PlanLimits;
  usage: UsageData | null;
  isTrial: boolean;
  isTrialExpired: boolean;
  trialEndsAt: Date | null;
  isLoading: boolean;
  refetch: () => void;
};

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { orgId } = useTenant();

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["billing", "plans"],
    queryFn: fetchPlans,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: subscription = null,
    isLoading: subLoading,
    refetch: refetchSub,
  } = useQuery({
    queryKey: ["billing", "subscription", orgId ?? ""],
    queryFn: () => fetchSubscriptionByOrg(orgId!),
    enabled: !!orgId,
    staleTime: 15 * 1000,
    refetchOnMount: "always",
  });

  const { data: usage = null, refetch: refetchUsage } = useQuery<UsageData>({
    queryKey: ["billing", "usage", orgId ?? ""],
    queryFn: fetchUsage,
    enabled: !!orgId,
    staleTime: 15 * 1000,
    refetchOnMount: "always",
  });

  const plan = useMemo(() => {
    if (!subscription || !plans.length) return null;
    // Match by planId first
    if (subscription.planId) {
      const byId = plans.find((p) => p.id === subscription.planId);
      if (byId) return byId;
    }
    // Fallback: match by planSlug (from API, more reliable after payment upgrade)
    if (subscription.planSlug) {
      const bySlug = plans.find((p) => p.slug === subscription.planSlug);
      if (bySlug) return bySlug;
    }
    return null;
  }, [subscription?.planId, subscription?.planSlug, plans]);

  const limits: PlanLimits = useMemo(
    () => ({
      maxUsers: plan?.maxUsers ?? null,
      maxProjects: plan?.maxProjects ?? null,
      storageLimitGb: plan?.storageLimitGb ?? null,
      automationLimit: plan?.automationLimit ?? null,
      integrationLimit: plan?.integrationLimit ?? null,
      maxApiKeys: plan?.maxApiKeys ?? null,
    }),
    [plan]
  );

  const trialEndsAt = useMemo(() => {
    const t = subscription?.trialEndsAt;
    if (!t) return null;
    const d = typeof t === "string" ? new Date(t) : t;
    return isNaN(d.getTime()) ? null : d;
  }, [subscription?.trialEndsAt]);

  const isTrial = subscription?.status?.toUpperCase() === "TRIAL" && !subscription?.isTrialExpired;
  const isTrialExpired = subscription?.isTrialExpired ?? false;

  const refetch = async () => {
    await Promise.all([refetchSub(), refetchUsage()]);
  };

  const value: PlanContextValue = useMemo(
    () => ({
      subscription,
      plan,
      plans,
      limits,
      usage,
      isTrial,
      isTrialExpired,
      trialEndsAt,
      isLoading: plansLoading || subLoading,
      refetch,
    }),
    [subscription, plan, plans, limits, usage, isTrial, isTrialExpired, trialEndsAt, plansLoading, subLoading]
  );

  return (
    <PlanContext.Provider value={value}>{children}</PlanContext.Provider>
  );
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used within PlanProvider");
  return ctx;
}

export function usePlanOptional(): PlanContextValue | null {
  return useContext(PlanContext);
}
