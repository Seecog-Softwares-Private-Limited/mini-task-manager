import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

/**
 * Injects the current authenticated user's id from the request (set by JwtAuthGuard).
 * Use after JwtAuthGuard. Throws UnauthorizedException if user is not present.
 */
export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ user?: { userId: string } }>();
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }
    return userId;
  },
);
