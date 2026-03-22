import { InvitationsRepository } from './repositories/invitations.repository';
import { EmailService } from './email.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { UsersService } from '../users/users.service';
import { OrganizationMembersRepository } from '../organizations/repositories/organization-members.repository';
import { UserEntity } from '../users/entities/user.entity';
import { OrganizationInvitationEntity } from './entities/organization-invitation.entity';
export declare class InvitationsService {
    private readonly invitationsRepo;
    private readonly emailService;
    private readonly orgsService;
    private readonly usersService;
    private readonly orgMembersRepo;
    constructor(invitationsRepo: InvitationsRepository, emailService: EmailService, orgsService: OrganizationsService, usersService: UsersService, orgMembersRepo: OrganizationMembersRepository);
    createInvitation(organizationId: string, email: string, role: string, invitedByUserId: string): Promise<OrganizationInvitationEntity>;
    listByOrganization(organizationId: string): Promise<OrganizationInvitationEntity[]>;
    validateToken(token: string): Promise<{
        valid: boolean;
        invitation?: OrganizationInvitationEntity;
        reason?: string;
    }>;
    validateTokenEnriched(token: string): Promise<{
        valid: boolean;
        reason?: string;
        organization?: {
            id: string;
            name: string;
        };
        project?: {
            id: string;
            name: string;
        } | null;
        role?: string;
        email?: string;
        expires_at?: string;
        status?: string;
    }>;
    acceptInvitation(token: string, userIdOrUser: string | UserEntity): Promise<{
        organizationId: string;
    }>;
    cancelInvitation(invitationId: string, organizationId: string): Promise<void>;
    resendInvitation(invitationId: string, organizationId: string): Promise<OrganizationInvitationEntity>;
}
