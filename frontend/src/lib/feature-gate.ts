/**
 * Feature gating: compare current usage to plan limits.
 * Use with usePlan() + current usage (e.g. project count, member count).
 */

export type LimitKey = "users" | "projects" | "storageGb" | "automations" | "integrations";

export type FeatureGateResult = {
  allowed: boolean;
  atLimit: boolean;
  overLimit: boolean;
  limit: number | null;
  current: number;
  showUpgrade: boolean;
};

export function checkLimit(
  limit: number | null,
  current: number
): Omit<FeatureGateResult, "showUpgrade"> {
  if (limit == null) {
    return { allowed: true, atLimit: false, overLimit: false, limit: null, current };
  }
  const atLimit = current >= limit;
  const overLimit = current > limit;
  return {
    allowed: !overLimit,
    atLimit,
    overLimit,
    limit,
    current,
  };
}

export function getFeatureGateResult(
  limit: number | null,
  current: number,
  showUpgradeWhenAtLimit: boolean
): FeatureGateResult {
  const base = checkLimit(limit, current);
  return {
    ...base,
    showUpgrade: base.atLimit || base.overLimit ? showUpgradeWhenAtLimit : false,
  };
}
