import { Repository } from 'typeorm';
import { NotificationEntity } from '../entities/notification.entity';
export declare class NotificationsRepository {
    private readonly repo;
    constructor(repo: Repository<NotificationEntity>);
    findById(id: string): Promise<NotificationEntity | null>;
    findByUser(userId: string, page: number, limit: number): Promise<[NotificationEntity[], number]>;
    create(data: Partial<NotificationEntity>): Promise<NotificationEntity>;
    markAsRead(id: string): Promise<void>;
    markAllAsReadByUser(userId: string): Promise<number>;
}
