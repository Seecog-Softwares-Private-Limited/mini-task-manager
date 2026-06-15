import type { CurrentPlanResponse, PlanListItem, UserPlanSlug } from "@/services/api/user-plans.api";
import { formatBytes } from "@/services/api/user-plans.api";

export const PLAN_ORDER: UserPlanSlug[] = ["free", "silver", "gold"];

export const PLAN_DESCRIPTIONS: Record<UserPlanSlug, string> = {
  free: "Perfect for getting started",
  silver: "Best for small teams",
  gold: "Built for growing organizations",
};

export type PlanCtaAction = "current" | "upgrade" | "downgrade" | "included";

export interface PlanCta {
  label: string;
  disabled: boolean;
  action: PlanCtaAction;
}

/** Tier features not exposed by /plans — used only for the comparison table. */
export const PLAN_FEATURE_FLAGS: Record<
  UserPlanSlug,
  {
    auditLogs: boolean;
    analytics: boolean;
    importExport: boolean;
    prioritySupport: boolean;
  }
> = {
  free: { auditLogs: false, analytics: false, importExport: false, prioritySupport: false },
  silver: { auditLogs: true, analytics: true, importExport: true, prioritySupport: false },
  gold: { auditLogs: true, analytics: true, importExport: true, prioritySupport: true },
};

export function planDisplayName(slug: UserPlanSlug): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

export function formatRenewalDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatRenewalSubtext(
  planExpiresAt: string | null | undefined,
  plan: UserPlanSlug
): string | null {
  if (!planExpiresAt || plan === "free") return null;
  return `Renews ${formatRenewalDate(planExpiresAt)}`;
}

const EXPIRING_SOON_DAYS = 7;

export function getRenewalStatus(
  planExpiresAt: string | null | undefined,
  plan: UserPlanSlug
): "none" | "normal" | "expiring_soon" {
  if (!planExpiresAt || plan === "free") return "none";
  const days = Math.ceil(
    (new Date(planExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (days <= EXPIRING_SOON_DAYS) return "expiring_soon";
  return "normal";
}

export function getFriendlyUsageMessage(
  plan: UserPlanSlug,
  usage: CurrentPlanResponse["usage"]
): string {
  const name = planDisplayName(plan);
  const ratios: number[] = [];

  if (usage.workspaces.limit) {
    ratios.push(usage.workspaces.used / usage.workspaces.limit);
  }
  if (usage.members.limit) {
    ratios.push(usage.members.used / usage.members.limit);
  }
  if (usage.storage.limitBytes) {
    ratios.push(usage.storage.usedBytes / usage.storage.limitBytes);
  }

  const maxPct = ratios.length ? Math.max(...ratios) : 0;

  if (maxPct >= 0.9) return `You're approaching your ${name} plan limits.`;
  if (maxPct >= 0.75) return `You're using most of your ${name} allocation.`;
  return `You are comfortably within your ${name} limits.`;
}

export function formatWorkspacesUsage(used: number, limit: number | null): string {
  if (limit === null) return `${used} workspaces · unlimited`;
  return `${used} of ${limit} used`;
}

export function formatMembersUsage(used: number): string {
  return `${used} active member${used === 1 ? "" : "s"}`;
}

export function formatStorageUsage(usedBytes: number, limitBytes: number): string {
  return `${formatBytes(usedBytes)} of ${formatBytes(limitBytes)} used`;
}

export function toLimitLabel(n: number | null): string {
  if (n === null) return "Unlimited";
  return String(n);
}

export function getPlanCta(target: UserPlanSlug, current: UserPlanSlug): PlanCta {
  if (target === current) {
    if (target === "free") {
      return { label: "Included", disabled: true, action: "included" };
    }
    return { label: "Current Plan", disabled: true, action: "current" };
  }

  const targetIdx = PLAN_ORDER.indexOf(target);
  const currentIdx = PLAN_ORDER.indexOf(current);

  if (targetIdx < currentIdx) {
    if (target === "free" && current === "silver") {
      return { label: "Contact support to downgrade", disabled: true, action: "downgrade" };
    }
    return { label: "Contact support to downgrade", disabled: true, action: "downgrade" };
  }

  return {
    label: `Upgrade to ${planDisplayName(target)}`,
    disabled: false,
    action: "upgrade",
  };
}

export function canUpgradeTo(current: UserPlanSlug | null | undefined, target: UserPlanSlug): boolean {
  if (!current) return target !== "free";
  if (current === "gold") return false;
  if (target === "free") return false;
  if (current === "silver") return target === "gold";
  if (current === "free") return target === "silver" || target === "gold";
  return false;
}

export function buildComparisonRows(plans: PlanListItem[]) {
  return plans.map((plan) => ({
    slug: plan.slug,
    name: plan.name,
    workspaces: toLimitLabel(plan.limits.maxWorkspaces),
    members: toLimitLabel(plan.limits.maxMembersPerWorkspace),
    storage: formatBytes(plan.limits.storageBytes),
    ...PLAN_FEATURE_FLAGS[plan.slug],
  }));
}
