"use client";

import { useCallback } from "react";
import { usePlan } from "@/context/plan-context";
import { useUpgradeModal } from "@/context/upgrade-modal-context";

type LimitResource = "users" | "projects" | "storageGb" | "automations" | "integrations";

const LIMIT_MAP: Record<LimitResource, keyof import("@/context/plan-context").PlanLimits> = {
  users: "maxUsers",
  projects: "maxProjects",
  storageGb: "storageLimitGb",
  automations: "automationLimit",
  integrations: "integrationLimit",
};

/**
 * Check if a resource is at or over its limit.
 */
export function useIsAtLimit(resource: LimitResource): boolean {
  const { usage, limits } = usePlan();
  const limit = limits[LIMIT_MAP[resource]];
  const current = usage?.[resource]?.current ?? 0;
  return limit != null && current >= limit;
}

/**
 * Guard that can be called before creating a resource. Returns true if allowed, false if not (and opens upgrade modal).
 */
export function useFeatureGuard(resource: LimitResource) {
  const { usage, limits } = usePlan();
  const { openUpgradeModal } = useUpgradeModal();

  const limit = limits[LIMIT_MAP[resource]];
  const current = usage?.[resource]?.current ?? 0;
  const atLimit = limit != null && current >= limit;

  const checkLimit = useCallback((): boolean => {
    if (atLimit) {
      openUpgradeModal("limit");
      return false;
    }
    return true;
  }, [atLimit, openUpgradeModal]);

  return { atLimit, checkLimit };
}
