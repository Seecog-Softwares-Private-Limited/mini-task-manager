import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { UserEntity } from '../../users/entities/user.entity';
export declare class OrganizationInvitationEntity {
    id: string;
    organizationId: string;
    email: string;
    role: string;
    token: string;
    invitedBy: string;
    status: string;
    expiresAt: Date;
    createdAt: Date;
    organization?: OrganizationEntity;
    inviter?: UserEntity;
}
