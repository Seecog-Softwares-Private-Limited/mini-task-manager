import { Repository } from 'typeorm';
import { OrganizationInvitationEntity } from '../entities/organization-invitation.entity';
export declare class InvitationsRepository {
    private readonly repo;
    constructor(repo: Repository<OrganizationInvitationEntity>);
    findById(id: string): Promise<OrganizationInvitationEntity | null>;
    findByToken(token: string): Promise<OrganizationInvitationEntity | null>;
    findPendingByOrgAndEmail(organizationId: string, email: string): Promise<OrganizationInvitationEntity | null>;
    findByOrganization(organizationId: string): Promise<OrganizationInvitationEntity[]>;
    create(data: Partial<OrganizationInvitationEntity>): Promise<OrganizationInvitationEntity>;
    updateStatus(id: string, status: string): Promise<void>;
    updateTokenAndExpiry(id: string, token: string, expiresAt: Date): Promise<void>;
}
