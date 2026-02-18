"use client";

import { useMemo } from "react";
import { usePlanOptional } from "@/context/plan-context";
import { type LimitKey, type FeatureGateResult, getFeatureGateResult } from "@/lib/feature-gate";

type Usage = { projects?: number; members?: number };

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
  const limit =
    limitKey === "projects"
      ? plan?.limits.maxProjects ?? null
      : plan?.limits.maxMembers ?? null;
  return useMemo(
    () => getFeatureGateResult(limit, current, showUpgrade),
    [limit, current, showUpgrade]
  );
}

/**
 * Returns { canCreateProject, canAddMember, projectGate, memberGate } from plan limits and usage.
 */
export function useFeatureGates(usage: Usage) {
  const projectGate = useFeatureGate("projects", usage.projects ?? 0);
  const memberGate = useFeatureGate("members", usage.members ?? 0);
  return useMemo(
    () => ({
      canCreateProject: projectGate.allowed,
      canAddMember: memberGate.allowed,
      projectGate,
      memberGate,
    }),
    [projectGate, memberGate]
  );
}
