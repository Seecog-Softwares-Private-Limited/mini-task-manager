import { BaseEntity } from '../../../common/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { UserEntity } from '../../users/entities/user.entity';
export declare class ProjectEntity extends BaseEntity {
    id: string;
    organizationId: string;
    name: string;
    description: string | null;
    iconUrl: string | null;
    visibility: string;
    isArchived: boolean;
    createdBy: string;
    organization?: OrganizationEntity;
    creator?: UserEntity;
}
