import { NotificationsService } from './notifications.service';
import { PaginationQueryDto } from '../../common/pagination';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    findAll(userId: string, query: PaginationQueryDto): Promise<import("../../common/pagination").PaginatedResult<import("./entities/notification.entity").NotificationEntity>>;
    markAsRead(id: string, userId: string): Promise<{
        message: string;
    }>;
    markAllAsRead(userId: string): Promise<{
        count: number;
    }>;
}
