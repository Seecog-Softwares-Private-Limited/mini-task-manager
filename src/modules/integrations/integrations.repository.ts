import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../common/utils/uuid.util';
import { OrganizationIntegrationEntity } from './entities/organization-integration.entity';

@Injectable()
export class IntegrationsRepository {
  constructor(
    @InjectRepository(OrganizationIntegrationEntity)
    private readonly repo: Repository<OrganizationIntegrationEntity>,
  ) {}

  findByOrganization(organizationId: string): Promise<OrganizationIntegrationEntity[]> {
    return this.repo.find({ where: { organizationId }, order: { createdAt: 'DESC' } });
  }

  findByOrgAndProvider(
    organizationId: string,
    provider: string,
  ): Promise<OrganizationIntegrationEntity | null> {
    return this.repo.findOne({ where: { organizationId, provider } });
  }

  async upsert(data: Partial<OrganizationIntegrationEntity>): Promise<OrganizationIntegrationEntity> {
    const existing = data.organizationId && data.provider
      ? await this.findByOrgAndProvider(data.organizationId, data.provider)
      : null;
    if (existing) {
      Object.assign(existing, data);
      return this.repo.save(existing);
    }
    const entity = this.repo.create({ ...data, id: data.id ?? generateUuid() });
    return this.repo.save(entity);
  }

  async delete(organizationId: string, provider: string): Promise<void> {
    await this.repo.delete({ organizationId, provider });
  }

  countActive(organizationId: string): Promise<number> {
    return this.repo.count({ where: { organizationId, isActive: true } });
  }
}
