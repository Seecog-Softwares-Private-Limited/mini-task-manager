import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UserPlanSlug } from '../../config/plans.config';
import { PlanConfigurationEntity } from '../entities/plan-configuration.entity';

@Injectable()
export class PlanConfigurationsRepository {
  constructor(
    @InjectRepository(PlanConfigurationEntity)
    private readonly repo: Repository<PlanConfigurationEntity>,
  ) {}

  findAll(): Promise<PlanConfigurationEntity[]> {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  findByPlanName(planName: UserPlanSlug): Promise<PlanConfigurationEntity | null> {
    return this.repo.findOne({ where: { planName } });
  }

  async upsert(
    planName: UserPlanSlug,
    data: Pick<
      PlanConfigurationEntity,
      'maxUsers' | 'maxStorage' | 'maxWorkspaces' | 'allowCoupon'
    >,
  ): Promise<PlanConfigurationEntity> {
    const existing = await this.findByPlanName(planName);
    if (existing) {
      await this.repo.update(existing.id, data);
      return (await this.findByPlanName(planName))!;
    }
    const entity = this.repo.create({
      planName,
      ...data,
    });
    return this.repo.save(entity);
  }
}

