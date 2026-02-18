import { OrganizationEntity } from './organization.entity';
import { UserEntity } from '../../users/entities/user.entity';
export declare class OrganizationMemberEntity {
    id: string;
    organizationId: string;
    userId: string;
    role: string;
    status: string;
    joinedAt: Date;
    organization?: OrganizationEntity;
    user?: UserEntity;
}
