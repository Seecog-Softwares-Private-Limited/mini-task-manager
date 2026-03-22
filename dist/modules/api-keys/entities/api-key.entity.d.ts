import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { UserEntity } from '../../users/entities/user.entity';
export declare class ApiKeyEntity {
    id: string;
    organizationId: string;
    name: string;
    keyHash: string;
    keyPrefix: string;
    createdBy: string;
    lastUsedAt: Date | null;
    createdAt: Date;
    organization?: OrganizationEntity;
    creator?: UserEntity;
}
