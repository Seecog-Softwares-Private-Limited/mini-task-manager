"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/context/tenant-context";
import { fetchPlans, fetchSubscription } from "@/services/api/billing.api";
import type { Plan, Subscription } from "@/types/api";

export type PlanLimits = {
  maxProjects: number | null;
  maxMembers: number | null;
};

export type PlanContextValue = {
  subscription: Subscription | null;
  plan: Plan | null;
  plans: Plan[];
  limits: PlanLimits;
  isTrial: boolean;
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
    refetch,
  } = useQuery({
    queryKey: ["billing", "subscription", orgId ?? ""],
    queryFn: fetchSubscription,
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });

  const plan = useMemo(() => {
    if (!subscription?.planId || !plans.length) return null;
    return plans.find((p) => p.id === subscription.planId) ?? null;
  }, [subscription?.planId, plans]);

  const limits: PlanLimits = useMemo(
    () => ({
      maxProjects: plan?.maxProjects ?? null,
      maxMembers: plan?.maxMembers ?? null,
    }),
    [plan]
  );

  const trialEndsAt = useMemo(() => {
    const t = subscription?.trialEndsAt;
    if (!t) return null;
    const d = typeof t === "string" ? new Date(t) : t;
    return isNaN(d.getTime()) ? null : d;
  }, [subscription?.trialEndsAt]);

  const isTrial =
    subscription?.status?.toUpperCase() === "TRIAL" || !!trialEndsAt;

  const value: PlanContextValue = useMemo(
    () => ({
      subscription,
      plan,
      plans,
      limits,
      isTrial,
      trialEndsAt,
      isLoading: plansLoading || subLoading,
      refetch,
    }),
    [
      subscription,
      plan,
      plans,
      limits,
      isTrial,
      trialEndsAt,
      plansLoading,
      subLoading,
      refetch,
    ]
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
