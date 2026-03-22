import { NotificationsRepository } from './repositories/notifications.repository';
import { PaginationQueryDto, PaginatedResult } from '../../common/pagination';
export declare class NotificationsService {
    private readonly notificationsRepository;
    constructor(notificationsRepository: NotificationsRepository);
    findByUser(userId: string, query: PaginationQueryDto): Promise<PaginatedResult<import('./entities/notification.entity').NotificationEntity>>;
    markAsRead(id: string, userId: string): Promise<void>;
    markAllAsRead(userId: string): Promise<{
        count: number;
    }>;
    createNotification(userId: string, title: string, message: string): Promise<void>;
}
