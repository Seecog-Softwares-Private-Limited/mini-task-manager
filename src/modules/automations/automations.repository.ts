import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../common/utils/uuid.util';
import { AutomationRuleEntity } from './entities/automation-rule.entity';

@Injectable()
export class AutomationsRepository {
  constructor(
    @InjectRepository(AutomationRuleEntity)
    private readonly repo: Repository<AutomationRuleEntity>,
  ) {}

  findByOrganization(organizationId: string): Promise<AutomationRuleEntity[]> {
    return this.repo.find({ where: { organizationId }, order: { createdAt: 'DESC' } });
  }

  countByOrganization(organizationId: string): Promise<number> {
    return this.repo.count({ where: { organizationId, isEnabled: true } });
  }

  findMatching(
    organizationId: string,
    triggerType: string,
    projectId?: string,
  ): Promise<AutomationRuleEntity[]> {
    const qb = this.repo
      .createQueryBuilder('r')
      .where('r.organization_id = :organizationId', { organizationId })
      .andWhere('r.is_enabled = 1')
      .andWhere('r.trigger_type = :triggerType', { triggerType });
    if (projectId) {
      qb.andWhere('(r.project_id IS NULL OR r.project_id = :projectId)', { projectId });
    }
    return qb.getMany();
  }

  async create(data: Partial<AutomationRuleEntity>): Promise<AutomationRuleEntity> {
    const entity = this.repo.create({ ...data, id: data.id ?? generateUuid() });
    return this.repo.save(entity);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.repo.delete({ id, organizationId });
  }
}
