import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { SubscriptionEntity } from '../entities/subscription.entity';

@Injectable()
export class SubscriptionsRepository {
  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly repo: Repository<SubscriptionEntity>,
  ) {}

  async findByOrganization(organizationId: string): Promise<SubscriptionEntity | null> {
    return this.repo.findOne({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: Partial<SubscriptionEntity>): Promise<SubscriptionEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    return this.repo.save(entity);
  }
}
