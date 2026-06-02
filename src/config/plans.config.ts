export type UserPlanSlug = 'free' | 'silver' | 'gold';

export const USER_PLAN = {
  FREE: 'free',
  SILVER: 'silver',
  GOLD: 'gold',
} as const satisfies Record<string, UserPlanSlug>;

export interface PlanLimits {
  maxWorkspaces: number | null;
  maxMembersPerWorkspace: number | null;
  storageBytes: number;
}

export interface PlanPricing {
  priceMonthlyInr: number;
  currency: 'INR';
  label: string;
}

export interface PlanDefinition {
  slug: UserPlanSlug;
  name: string;
  pricing: PlanPricing;
  limits: PlanLimits;
  benefits: string[];
}

const MB = 1024 * 1024;
const GB = 1024 * MB;

export const PLANS: Record<UserPlanSlug, PlanDefinition> = {
  free: {
    slug: 'free',
    name: 'Free',
    pricing: { priceMonthlyInr: 0, currency: 'INR', label: 'Free' },
    limits: {
      maxWorkspaces: 1,
      maxMembersPerWorkspace: 5,
      storageBytes: 500 * MB,
    },
    benefits: ['1 workspace', '5 members per workspace', '500 MB storage'],
  },
  silver: {
    slug: 'silver',
    name: 'Silver',
    pricing: { priceMonthlyInr: 500, currency: 'INR', label: '₹500/month' },
    limits: {
      maxWorkspaces: 1,
      maxMembersPerWorkspace: 20,
      storageBytes: 2 * GB,
    },
    benefits: ['1 workspace', '20 members per workspace', '2 GB storage'],
  },
  gold: {
    slug: 'gold',
    name: 'Gold',
    pricing: { priceMonthlyInr: 1000, currency: 'INR', label: '₹1000/month' },
    limits: {
      maxWorkspaces: 10,
      maxMembersPerWorkspace: null,
      storageBytes: 4 * GB,
    },
    benefits: ['10 workspaces', 'Unlimited members', '4 GB storage'],
  },
};

export const PLAN_ORDER: UserPlanSlug[] = ['free', 'silver', 'gold'];

export function getPlanDefinition(slug: UserPlanSlug): PlanDefinition {
  return PLANS[slug];
}

export function normalizePlanSlug(value: string | null | undefined): UserPlanSlug {
  const v = (value ?? 'free').toLowerCase();
  if (v === 'silver' || v === 'gold') return v;
  return 'free';
}

/** Plans a user can upgrade to when hitting a limit. */
export function getUpgradeOptions(current: UserPlanSlug): UserPlanSlug[] {
  const idx = PLAN_ORDER.indexOf(current);
  if (idx < 0 || idx >= PLAN_ORDER.length - 1) return [];
  return PLAN_ORDER.slice(idx + 1);
}

export function formatStorageBytes(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toFixed(bytes % GB === 0 ? 0 : 1)} GB`;
  if (bytes >= MB) return `${Math.round(bytes / MB)} MB`;
  return `${bytes} B`;
}
