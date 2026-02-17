import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Injects the current organization id from the request (set by tenant guard/middleware).
 * Use after TenantGuard so that tenant context is available.
 */
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<{ tenantId?: string }>();
    return request.tenantId;
  },
);
