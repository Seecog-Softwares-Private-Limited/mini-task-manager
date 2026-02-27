/**
 * Feature guard utility — reusable subscription enforcement helpers.
 *
 * Usage in any controller:
 *
 *   import { CheckSubscriptionLimit, LimitResource } from './billing/decorators/check-limit.decorator';
 *   import { SubscriptionGuard } from './billing/guards/subscription.guard';
 *
 *   @UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard)
 *   @CheckSubscriptionLimit('projects')
 *   @Post()
 *   async create() { ... }
 *
 * Or programmatically via UsageService:
 *
 *   const result = await this.usageService.checkLimit(orgId, 'projects');
 *   if (!result.allowed) throw new ForbiddenException(result.message);
 */
export { CheckSubscriptionLimit, type LimitResource } from './decorators/check-limit.decorator';
export { SubscriptionGuard } from './guards/subscription.guard';
export { UsageService, type OrganizationUsage, type UsageCheckResult } from './usage.service';

/** Structured error body returned when subscription limit is exceeded. */
export interface SubscriptionLimitErrorBody {
  statusCode: number;
  error: string;
  code: 'SUBSCRIPTION_LIMIT_EXCEEDED';
  resource: string;
  current: number;
  limit: number | null;
  message: string;
  upgradeUrl: string;
}

/** Check if an error response is a subscription limit error. */
export function isSubscriptionLimitError(err: unknown): err is { response?: { data?: SubscriptionLimitErrorBody } } {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  return data != null && typeof data === 'object' && (data as { code?: string }).code === 'SUBSCRIPTION_LIMIT_EXCEEDED';
}
