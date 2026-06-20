import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { OrganizationCustomRoleEntity } from '../entities/organization-custom-role.entity';

@Injectable()
export class CustomRolesRepository {
  constructor(
    @InjectRepository(OrganizationCustomRoleEntity)
    private readonly repo: Repository<OrganizationCustomRoleEntity>,
  ) {}

  findByOrganization(organizationId: string): Promise<OrganizationCustomRoleEntity[]> {
    return this.repo.find({ where: { organizationId }, order: { createdAt: 'ASC' } });
  }

  findByKey(organizationId: string, roleKey: string): Promise<OrganizationCustomRoleEntity | null> {
    return this.repo.findOne({ where: { organizationId, roleKey } });
  }

  async upsert(
    organizationId: string,
    roleKey: string,
    data: { label: string; permissions: Record<string, boolean> },
  ): Promise<OrganizationCustomRoleEntity> {
    const existing = await this.findByKey(organizationId, roleKey);
    if (existing) {
      existing.label = data.label;
      existing.permissionsJson = data.permissions;
      return this.repo.save(existing);
    }
    const entity = this.repo.create({
      id: generateUuid(),
      organizationId,
      roleKey,
      label: data.label,
      permissionsJson: data.permissions,
    });
    return this.repo.save(entity);
  }

  async delete(organizationId: string, roleKey: string): Promise<void> {
    await this.repo.delete({ organizationId, roleKey });
  }
}
