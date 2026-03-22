import { BaseEntity } from '../../../common/base.entity';
import { UserEntity } from '../../users/entities/user.entity';
export declare class OrganizationEntity extends BaseEntity {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    ownerId: string;
    isArchived: boolean;
    owner?: UserEntity;
}
