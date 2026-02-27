"use client";

import { useMemo } from "react";
import { usePlanOptional } from "@/context/plan-context";
import { type LimitKey, type FeatureGateResult, getFeatureGateResult } from "@/lib/feature-gate";

type Usage = { users?: number; projects?: number; storageGb?: number; automations?: number; integrations?: number };

const LIMIT_MAP: Record<LimitKey, keyof import("@/context/plan-context").PlanLimits> = {
  users: "maxUsers",
  projects: "maxProjects",
  storageGb: "storageLimitGb",
  automations: "automationLimit",
  integrations: "integrationLimit",
};

/**
 * Returns gate result for a given limit key (e.g. "projects") and current usage.
 * When plan context is missing or no limit is set, returns allowed: true.
 */
export function useFeatureGate(
  limitKey: LimitKey,
  current: number,
  options?: { showUpgradeWhenAtLimit?: boolean }
): FeatureGateResult {
  const plan = usePlanOptional();
  const showUpgrade = options?.showUpgradeWhenAtLimit ?? true;
  const limitProp = LIMIT_MAP[limitKey];
  const limit = plan?.limits[limitProp] ?? null;
  return useMemo(
    () => getFeatureGateResult(limit, current, showUpgrade),
    [limit, current, showUpgrade]
  );
}

/**
 * Returns feature gates for all resource types from plan limits and usage.
 */
export function useFeatureGates(usage: Usage) {
  const usersGate = useFeatureGate("users", usage.users ?? 0);
  const projectGate = useFeatureGate("projects", usage.projects ?? 0);
  const storageGate = useFeatureGate("storageGb", usage.storageGb ?? 0);
  const automationsGate = useFeatureGate("automations", usage.automations ?? 0);
  const integrationsGate = useFeatureGate("integrations", usage.integrations ?? 0);
  return useMemo(
    () => ({
      canAddUser: usersGate.allowed,
      canCreateProject: projectGate.allowed,
      canUseStorage: storageGate.allowed,
      canUseAutomation: automationsGate.allowed,
      canUseIntegration: integrationsGate.allowed,
      usersGate,
      projectGate,
      storageGate,
      automationsGate,
      integrationsGate,
    }),
    [usersGate, projectGate, storageGate, automationsGate, integrationsGate]
  );
}
