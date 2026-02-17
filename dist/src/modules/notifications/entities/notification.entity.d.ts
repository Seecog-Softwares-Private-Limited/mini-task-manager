import { UserEntity } from '../../users/entities/user.entity';
export declare class NotificationEntity {
    id: string;
    userId: string;
    title: string | null;
    message: string | null;
    isRead: boolean;
    createdAt: Date;
    user?: UserEntity;
}
