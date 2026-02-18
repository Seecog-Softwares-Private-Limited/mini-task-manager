import { OrganizationMemberEntity } from '../entities/organization-member.entity';

/**
 * Abstraction for organization membership data access.
 * Enables dependency inversion (e.g. TenantGuard depends on this interface).
 */
export const ORGANIZATION_MEMBERS_REPOSITORY = Symbol('OrganizationMembersRepository');

export interface IOrganizationMembersRepository {
  findByOrganizationAndUser(organizationId: string, userId: string): Promise<OrganizationMemberEntity | null>;
  findByOrganization(organizationId: string): Promise<OrganizationMemberEntity[]>;
  findByOrganizationWithUser(organizationId: string): Promise<OrganizationMemberEntity[]>;
  findByUser(userId: string): Promise<OrganizationMemberEntity[]>;
  create(data: Partial<OrganizationMemberEntity>): Promise<OrganizationMemberEntity>;
  update(id: string, data: Partial<OrganizationMemberEntity>): Promise<void>;
}
