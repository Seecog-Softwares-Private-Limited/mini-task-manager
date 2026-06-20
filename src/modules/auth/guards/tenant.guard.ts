import { ForbiddenException, Injectable, CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import {
  ORGANIZATION_MEMBERS_REPOSITORY,
  IOrganizationMembersRepository,
} from '../../organizations/repositories/organization-members.repository.interface';
import { OrganizationsRepository } from '../../organizations/repositories/organizations.repository';

/**
 * Resolves tenant (organization) from header (e.g. X-Organization-Id) and sets request.tenantId.
 * Validates that the current user is a member of that organization.
 * Use after JwtAuthGuard so request.user is set.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(ORGANIZATION_MEMBERS_REPOSITORY)
    private readonly orgMembersRepo: IOrganizationMembersRepository,
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<
      Request & {
        user?: {
          userId: string;
          isApiKey?: boolean;
          apiKeyOrganizationId?: string;
        };
        tenantId?: string;
      }
    >();
    const userId = request.user?.userId;
    const orgId = (request.headers['x-organization-id'] as string)?.trim?.();

    if (!orgId) {
      throw new ForbiddenException('Organization context required. Select an organization in the app.');
    }

    const org = await this.organizationsRepository.findById(orgId);
    if (!org || org.status === 'DELETED') {
      throw new ForbiddenException('This organization is no longer available.');
    }
    if (org.status === 'SUSPENDED') {
      throw new ForbiddenException(
        org.suspensionReason
          ? `This organization has been suspended: ${org.suspensionReason}`
          : 'This organization has been suspended. Contact support.',
      );
    }

    if (request.user?.isApiKey) {
      if (request.user.apiKeyOrganizationId !== orgId) {
        throw new ForbiddenException('API key is not valid for this organization.');
      }
      request.tenantId = orgId;
      const user = request.user as { userId: string; orgRole?: string; roles?: string[] };
      user.orgRole = 'member';
      user.roles = ['member'];
      return true;
    }

    const membership = await this.orgMembersRepo.findByOrganizationAndUser(orgId, userId!);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization.');
    }

    request.tenantId = orgId;
    if (request.user) {
      const user = request.user as { userId: string; orgRole?: string; roles?: string[] };
      user.orgRole = membership.role;
      user.roles = [membership.role];
    }
    return true;
  }
}
