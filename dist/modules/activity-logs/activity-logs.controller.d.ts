import { ActivityLogsService } from './activity-logs.service';
import { PaginationQueryDto } from '../../common/pagination';
export declare class ActivityLogsController {
    private readonly activityLogsService;
    constructor(activityLogsService: ActivityLogsService);
    findAll(tenantId?: string, query?: PaginationQueryDto): Promise<{
        data: {
            id: string;
            organizationId: string;
            userId: string | null;
            entityType: string;
            entityId: string | null;
            action: string;
            metadata: Record<string, unknown> | null;
            createdAt: Date;
            user: {
                fullName: string;
                email: string;
            } | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
}
