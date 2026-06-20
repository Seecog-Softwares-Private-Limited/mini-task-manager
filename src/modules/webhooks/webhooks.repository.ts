import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../common/utils/uuid.util';
import { OrganizationWebhookEntity } from './entities/organization-webhook.entity';

@Injectable()
export class WebhooksRepository {
  constructor(
    @InjectRepository(OrganizationWebhookEntity)
    private readonly repo: Repository<OrganizationWebhookEntity>,
  ) {}

  findByOrganization(organizationId: string): Promise<OrganizationWebhookEntity[]> {
    return this.repo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  findById(id: string): Promise<OrganizationWebhookEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(data: Partial<OrganizationWebhookEntity>): Promise<OrganizationWebhookEntity> {
    const entity = this.repo.create({ ...data, id: data.id ?? generateUuid() });
    return this.repo.save(entity);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.repo.delete({ id, organizationId });
  }

  findActiveForEvent(organizationId: string, event: string): Promise<OrganizationWebhookEntity[]> {
    return this.repo
      .createQueryBuilder('w')
      .where('w.organization_id = :organizationId', { organizationId })
      .andWhere('w.is_active = 1')
      .andWhere('JSON_CONTAINS(w.events_json, :eventJson)', { eventJson: JSON.stringify(event) })
      .getMany();
  }
}
