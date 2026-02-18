import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { UserEntity } from '../../users/entities/user.entity';
export declare class ActivityLogEntity {
    id: string;
    organizationId: string;
    userId: string | null;
    entityType: string;
    entityId: string | null;
    action: string;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    organization?: OrganizationEntity;
    user?: UserEntity;
}
