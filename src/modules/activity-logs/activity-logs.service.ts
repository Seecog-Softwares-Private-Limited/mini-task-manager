import { Injectable } from '@nestjs/common';
import { ActivityLogsRepository } from './repositories/activity-logs.repository';
import { PaginationQueryDto, PaginatedResult, paginate } from '../../common/pagination';

@Injectable()
export class ActivityLogsService {
  constructor(private readonly activityLogsRepository: ActivityLogsRepository) {}

  async findByOrganization(organizationId: string, query?: PaginationQueryDto): Promise<PaginatedResult<import('./entities/activity-log.entity').ActivityLogEntity>> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const [data, total] = await this.activityLogsRepository.findByOrganization(
      organizationId,
      page,
      limit,
    );
    return paginate(data, total, page, limit);
  }

  async log(data: {
    organizationId: string;
    userId?: string;
    entityType: string;
    entityId?: string;
    action: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.activityLogsRepository.create(data);
  }
}
