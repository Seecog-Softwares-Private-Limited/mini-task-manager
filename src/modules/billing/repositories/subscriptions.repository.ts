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
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByRazorpaySubscriptionId(razorpaySubId: string): Promise<SubscriptionEntity | null> {
    return this.repo.findOne({
      where: { razorpaySubscriptionId: razorpaySubId },
      relations: ['plan'],
    });
  }

  async findExpiredTrials(): Promise<SubscriptionEntity[]> {
    return this.repo
      .createQueryBuilder('s')
      .where('s.status = :status', { status: 'TRIAL' })
      .andWhere('s.trial_ends_at <= NOW()')
      .getMany();
  }

  async create(data: Partial<SubscriptionEntity>): Promise<SubscriptionEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    return this.repo.save(entity);
  }

  async save(entity: SubscriptionEntity): Promise<SubscriptionEntity> {
    return this.repo.save(entity);
  }
}
