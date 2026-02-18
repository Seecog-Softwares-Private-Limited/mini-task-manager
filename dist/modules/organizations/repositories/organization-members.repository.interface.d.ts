import { OrganizationMemberEntity } from '../entities/organization-member.entity';
export declare const ORGANIZATION_MEMBERS_REPOSITORY: unique symbol;
export interface IOrganizationMembersRepository {
    findByOrganizationAndUser(organizationId: string, userId: string): Promise<OrganizationMemberEntity | null>;
    findByOrganization(organizationId: string): Promise<OrganizationMemberEntity[]>;
    findByOrganizationWithUser(organizationId: string): Promise<OrganizationMemberEntity[]>;
    findByUser(userId: string): Promise<OrganizationMemberEntity[]>;
    create(data: Partial<OrganizationMemberEntity>): Promise<OrganizationMemberEntity>;
    update(id: string, data: Partial<OrganizationMemberEntity>): Promise<void>;
}
