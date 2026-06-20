import { ForbiddenException, Injectable } from '@nestjs/common';
import { CustomRolesRepository } from './repositories/custom-roles.repository';
import { UsageService } from '../billing/usage.service';
import { OrganizationsService } from './organizations.service';

export const DEFAULT_GUEST_PERMISSIONS: Record<string, boolean> = {
  'tasks.read': true,
  'tasks.write': false,
  'projects.read': true,
  'projects.write': false,
  'settings.manage': false,
  'webhooks.manage': false,
};

@Injectable()
export class CustomRolesService {
  constructor(
    private readonly customRolesRepository: CustomRolesRepository,
    private readonly usageService: UsageService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async list(organizationId: string, userId: string) {
    await this.assertAdmin(organizationId, userId);
    const roles = await this.customRolesRepository.findByOrganization(organizationId);
    return roles.map((r) => ({
      roleKey: r.roleKey,
      label: r.label,
      permissions: r.permissionsJson,
    }));
  }

  async upsert(
    organizationId: string,
    userId: string,
    data: { roleKey: string; label: string; permissions: Record<string, boolean> },
  ) {
    await this.assertAdmin(organizationId, userId);
    const flags = await this.usageService.getFeatureFlags(organizationId);
    if (!flags.auditLogsEnabled && data.roleKey !== 'guest') {
      throw new ForbiddenException('Custom roles require Enterprise plan.');
    }
    return this.customRolesRepository.upsert(organizationId, data.roleKey, {
      label: data.label,
      permissions: data.permissions,
    });
  }

  async getPermissionsForRole(
    organizationId: string,
    roleKey: string,
  ): Promise<Record<string, boolean> | null> {
    const custom = await this.customRolesRepository.findByKey(organizationId, roleKey);
    return custom?.permissionsJson ?? null;
  }

  private async assertAdmin(organizationId: string, userId: string) {
    const role = await this.organizationsService.getMemberRole(organizationId, userId);
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenException('Only owners and admins can manage roles.');
    }
  }
}
