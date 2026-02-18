import { ActivityLogsService } from './activity-logs.service';
import { PaginationQueryDto } from '../../common/pagination';
export declare class ActivityLogsController {
    private readonly activityLogsService;
    constructor(activityLogsService: ActivityLogsService);
    findAll(tenantId?: string, query?: PaginationQueryDto): Promise<import("../../common/pagination").PaginatedResult<import("./entities/activity-log.entity").ActivityLogEntity>>;
}
