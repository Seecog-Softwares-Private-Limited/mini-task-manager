import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CHECK_LIMIT_KEY, type LimitResource } from '../decorators/check-limit.decorator';
import { UsageService } from '../usage.service';

/**
 * Guard that enforces subscription plan limits.
 * Reads the @CheckSubscriptionLimit() decorator to determine which resource to check.
 * Must be applied after JwtAuthGuard + TenantGuard so `request.tenantId` is set.
 *
 * Returns a structured 403 error with upgrade information when limit is exceeded.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usageService: UsageService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.getAllAndOverride<LimitResource | undefined>(
      CHECK_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @CheckSubscriptionLimit decorator → allow
    if (!resource) return true;

    const request = context.switchToHttp().getRequest<Request & { tenantId?: string }>();
    let organizationId = request.tenantId;
    // Fallback: for routes like POST /organizations/:id/invitations, orgId is in params
    if (!organizationId && request.params?.id && request.originalUrl?.includes('/organizations/')) {
      const paramId = request.params.id;
      organizationId = Array.isArray(paramId) ? paramId[0] : paramId;
    }

    if (!organizationId) {
      return true;
    }

    const result = await this.usageService.checkLimit(organizationId, resource);

    if (result.allowed) return true;

    throw new HttpException(
      {
        statusCode: HttpStatus.FORBIDDEN,
        error: 'LIMIT_EXCEEDED',
        code: 'SUBSCRIPTION_LIMIT_EXCEEDED',
        resource: result.resource,
        current: result.current,
        limit: result.limit,
        message: result.message,
        upgradeUrl: '/dashboard/billing',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
