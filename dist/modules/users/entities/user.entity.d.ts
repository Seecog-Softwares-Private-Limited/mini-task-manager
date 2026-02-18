import { BaseEntity } from '../../../common/base.entity';
export declare class UserEntity extends BaseEntity {
    id: string;
    fullName: string;
    email: string;
    passwordHash: string | null;
    avatarUrl: string | null;
    isEmailVerified: boolean;
    isActive: boolean;
    lastSeenAt: Date | null;
}
