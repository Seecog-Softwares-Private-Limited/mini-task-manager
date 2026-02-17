import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { JwtPayload } from '../strategies/jwt.strategy';

/**
 * RBAC guard: allows access only if the user has one of the required roles.
 * Expects request.user to be set by JwtAuthGuard.
 * Role resolution (org/project role) should be done in a tenant context service or guard.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: JwtPayload & { roles?: string[] } }>();
    if (!user?.roles) return false;
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
