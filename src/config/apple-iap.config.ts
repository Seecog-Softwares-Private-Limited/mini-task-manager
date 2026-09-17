import type { UserPlanSlug } from './plans.config';

/** App Store Connect product IDs ↔ OpsPick user plans. */
export const APPLE_IAP_PRODUCTS = {
  SILVER_MONTHLY: 'opspick.silver.monthly',
  GOLD_MONTHLY: 'opspick.gold.monthly',
} as const;

export type AppleIapProductId =
  (typeof APPLE_IAP_PRODUCTS)[keyof typeof APPLE_IAP_PRODUCTS];

const PRODUCT_TO_PLAN: Record<string, UserPlanSlug> = {
  [APPLE_IAP_PRODUCTS.SILVER_MONTHLY]: 'silver',
  [APPLE_IAP_PRODUCTS.GOLD_MONTHLY]: 'gold',
};

export function planSlugFromAppleProductId(
  productId: string | null | undefined,
): UserPlanSlug | null {
  if (!productId) return null;
  return PRODUCT_TO_PLAN[productId] ?? null;
}

export function appleProductIdForPlan(plan: UserPlanSlug): string | null {
  if (plan === 'silver') return APPLE_IAP_PRODUCTS.SILVER_MONTHLY;
  if (plan === 'gold') return APPLE_IAP_PRODUCTS.GOLD_MONTHLY;
  return null;
}

export const APPLE_IAP_PRODUCT_IDS: string[] = Object.values(APPLE_IAP_PRODUCTS);
