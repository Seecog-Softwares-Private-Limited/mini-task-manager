import { InvitationsService } from './invitations.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
export declare class InvitationsController {
    private readonly invitationsService;
    private readonly orgsService;
    constructor(invitationsService: InvitationsService, orgsService: OrganizationsService);
    create(orgId: string, dto: CreateInvitationDto, userId: string, orgIdHeader?: string): Promise<{
        id: string;
        organizationId: string;
        email: string;
        role: string;
        status: string;
        expiresAt: Date;
        createdAt: Date;
        inviter: {
            id: string;
            fullName: string;
            email: string;
        } | undefined;
    }>;
    list(orgId: string, userId: string, orgIdHeader?: string): Promise<{
        id: string;
        organizationId: string;
        email: string;
        role: string;
        status: string;
        expiresAt: Date;
        createdAt: Date;
        inviter: {
            id: string;
            fullName: string;
            email: string;
        } | undefined;
    }[]>;
    resend(orgId: string, invId: string, userId: string, orgIdHeader?: string): Promise<{
        id: string;
        organizationId: string;
        email: string;
        role: string;
        status: string;
        expiresAt: Date;
        createdAt: Date;
        inviter: {
            id: string;
            fullName: string;
            email: string;
        } | undefined;
    }>;
    cancel(orgId: string, invId: string, userId: string, orgIdHeader?: string): Promise<{
        success: boolean;
    }>;
    validateQuery(token: string): Promise<{
        valid: boolean;
        reason: string | undefined;
        email?: undefined;
        organizationName?: undefined;
        role?: undefined;
    } | {
        valid: boolean;
        email: string;
        organizationName: string;
        role: string;
        reason?: undefined;
    }>;
    validatePath(token: string): Promise<{
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
    accept(dto: AcceptInvitationDto, userId: string): Promise<{
        success: boolean;
        organizationId: string;
    }>;
    acceptByPath(token: string, userId: string): Promise<{
        success: boolean;
        organizationId: string;
    }>;
    private toResponse;
}
