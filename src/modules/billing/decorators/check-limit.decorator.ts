import { SetMetadata } from '@nestjs/common';

export const CHECK_LIMIT_KEY = 'check_subscription_limit';

export type LimitResource = 'users' | 'projects' | 'storageGb' | 'automations' | 'integrations' | 'apiKeys';

/**
 * Decorator that enforces subscription limits before allowing resource creation.
 * Apply to POST endpoints that create new resources.
 *
 * @example
 * @CheckSubscriptionLimit('projects')
 * @Post()
 * async createProject(...) { ... }
 */
export const CheckSubscriptionLimit = (resource: LimitResource) =>
  SetMetadata(CHECK_LIMIT_KEY, resource);
