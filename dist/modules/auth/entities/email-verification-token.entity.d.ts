import { UserEntity } from '../../users/entities/user.entity';
export declare class EmailVerificationTokenEntity {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    user?: UserEntity;
}
