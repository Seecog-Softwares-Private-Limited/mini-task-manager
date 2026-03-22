import { UserEntity } from '../../users/entities/user.entity';
export declare class PasswordResetTokenEntity {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    user?: UserEntity;
}
