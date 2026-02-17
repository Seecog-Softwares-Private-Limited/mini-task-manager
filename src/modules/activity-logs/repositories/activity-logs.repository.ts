import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getSkip } from '../../../common/pagination';
import { generateUuid } from '../../../common/utils/uuid.util';
import { ActivityLogEntity } from '../entities/activity-log.entity';

@Injectable()
export class ActivityLogsRepository {
  constructor(
    @InjectRepository(ActivityLogEntity)
    private readonly repo: Repository<ActivityLogEntity>,
  ) {}

  async findByOrganization(
    organizationId: string,
    page: number,
    limit: number,
  ): Promise<[ActivityLogEntity[], number]> {
    return this.repo.findAndCount({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      skip: getSkip(page, limit),
      take: limit,
    });
  }

  async create(data: Partial<ActivityLogEntity>): Promise<ActivityLogEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    return this.repo.save(entity);
  }
}
