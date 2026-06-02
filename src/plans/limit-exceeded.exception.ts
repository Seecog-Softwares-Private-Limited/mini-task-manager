import { HttpException, HttpStatus } from '@nestjs/common';
import {
  getPlanDefinition,
  getUpgradeOptions,
  type UserPlanSlug,
} from '../config/plans.config';

export type PlanLimitType = 'workspace' | 'member' | 'storage';

export interface UpgradeOptionPayload {
  plan: UserPlanSlug;
  price: number;
  currency: 'INR';
  benefits: string[];
}

export interface LimitExceededPayload {
  error: 'LIMIT_EXCEEDED';
  limitType: PlanLimitType;
  currentPlan: UserPlanSlug;
  currentUsage: number;
  planLimit: number | null;
  message: string;
  maximumPlan?: boolean;
  upgradeTo: UpgradeOptionPayload[];
}

export class LimitExceededException extends HttpException {
  constructor(payload: LimitExceededPayload) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        ...payload,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export function buildLimitExceededPayload(
  limitType: PlanLimitType,
  currentPlan: UserPlanSlug,
  currentUsage: number,
  planLimit: number | null,
): LimitExceededPayload {
  const upgradeSlugs = getUpgradeOptions(currentPlan);
  const upgradeTo: UpgradeOptionPayload[] = upgradeSlugs.map((slug) => {
    const def = getPlanDefinition(slug);
    return {
      plan: slug,
      price: def.pricing.priceMonthlyInr,
      currency: 'INR',
      benefits: def.benefits,
    };
  });

  const limitLabel =
    limitType === 'workspace'
      ? 'workspace'
      : limitType === 'member'
        ? 'member'
        : 'storage';

  const maximumPlan = currentPlan === 'gold';

  return {
    error: 'LIMIT_EXCEEDED',
    limitType,
    currentPlan,
    currentUsage,
    planLimit,
    message: maximumPlan
      ? `You are on the Gold plan and have reached the maximum ${limitLabel} limit.`
      : `You have reached your ${limitLabel} limit on the ${getPlanDefinition(currentPlan).name} plan.`,
    ...(maximumPlan ? { maximumPlan: true } : {}),
    upgradeTo,
  };
}
