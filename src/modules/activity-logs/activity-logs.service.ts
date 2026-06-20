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

  async exportCsv(organizationId: string): Promise<string> {
    const [rows] = await this.activityLogsRepository.findByOrganization(organizationId, 1, 10_000);
    const lines = ['id,user_id,entity_type,entity_id,action,created_at'];
    for (const row of rows) {
      lines.push(
        [
          row.id,
          row.userId ?? '',
          row.entityType,
          row.entityId ?? '',
          row.action,
          row.createdAt?.toISOString?.() ?? '',
        ].join(','),
      );
    }
    return lines.join('\n');
  }
}
