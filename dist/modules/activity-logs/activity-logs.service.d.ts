import { ActivityLogsRepository } from './repositories/activity-logs.repository';
import { PaginationQueryDto, PaginatedResult } from '../../common/pagination';
export declare class ActivityLogsService {
    private readonly activityLogsRepository;
    constructor(activityLogsRepository: ActivityLogsRepository);
    findByOrganization(organizationId: string, query?: PaginationQueryDto): Promise<PaginatedResult<import('./entities/activity-log.entity').ActivityLogEntity>>;
    log(data: {
        organizationId: string;
        userId?: string;
        entityType: string;
        entityId?: string;
        action: string;
        metadata?: Record<string, unknown>;
    }): Promise<void>;
}
