"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvitationsService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const invitations_repository_1 = require("./repositories/invitations.repository");
const email_service_1 = require("./email.service");
const organizations_service_1 = require("../organizations/organizations.service");
const users_service_1 = require("../users/users.service");
const organization_members_repository_1 = require("../organizations/repositories/organization-members.repository");
const uuid_util_1 = require("../../common/utils/uuid.util");
const frontend_url_util_1 = require("../../common/utils/frontend-url.util");
const INVITE_EXPIRY_DAYS = 7;
function generateToken() {
    return (0, crypto_1.randomBytes)(32).toString('hex');
}
function expiresAt() {
    const d = new Date();
    d.setDate(d.getDate() + INVITE_EXPIRY_DAYS);
    return d;
}
let InvitationsService = class InvitationsService {
    constructor(invitationsRepo, emailService, orgsService, usersService, orgMembersRepo) {
        this.invitationsRepo = invitationsRepo;
        this.emailService = emailService;
        this.orgsService = orgsService;
        this.usersService = usersService;
        this.orgMembersRepo = orgMembersRepo;
    }
    async createInvitation(organizationId, email, role, invitedByUserId) {
        const normalizedEmail = email.toLowerCase().trim();
        const existingMember = await this.orgMembersRepo.findByOrganizationWithUser(organizationId);
        const alreadyMember = existingMember.find((m) => m.user?.email?.toLowerCase() === normalizedEmail && m.status === 'ACTIVE');
        if (alreadyMember) {
            throw new common_1.ConflictException('User is already a member of this organization');
        }
        const existingInvite = await this.invitationsRepo.findPendingByOrgAndEmail(organizationId, normalizedEmail);
        if (existingInvite) {
            throw new common_1.ConflictException('A pending invitation already exists for this email');
        }
        const token = generateToken();
        const invitation = await this.invitationsRepo.create({
            organizationId,
            email: normalizedEmail,
            role,
            token,
            invitedBy: invitedByUserId,
            status: 'PENDING',
            expiresAt: expiresAt(),
        });
        const org = await this.orgsService.findById(organizationId);
        const inviter = await this.usersService.findById(invitedByUserId);
        const acceptUrl = `${(0, frontend_url_util_1.resolveFrontendPublicUrl)()}/invite/${token}`;
        await this.emailService.sendInvitation({
            to: normalizedEmail,
            organizationName: org?.name ?? 'Unknown Organization',
            inviterName: inviter?.fullName ?? inviter?.email ?? 'A team member',
            role,
            acceptUrl,
        });
        return invitation;
    }
    async listByOrganization(organizationId) {
        return this.invitationsRepo.findByOrganization(organizationId);
    }
    async validateToken(token) {
        const invitation = await this.invitationsRepo.findByToken(token);
        if (!invitation) {
            return { valid: false, reason: 'Invitation not found' };
        }
        if (invitation.status !== 'PENDING') {
            return { valid: false, reason: `Invitation has been ${invitation.status.toLowerCase()}` };
        }
        if (new Date() > invitation.expiresAt) {
            await this.invitationsRepo.updateStatus(invitation.id, 'EXPIRED');
            return { valid: false, reason: 'Invitation has expired' };
        }
        return { valid: true, invitation };
    }
    async validateTokenEnriched(token) {
        const invitation = await this.invitationsRepo.findByToken(token);
        if (!invitation) {
            return { valid: false, reason: 'Invitation not found' };
        }
        if (invitation.status !== 'PENDING') {
            return {
                valid: false,
                reason: `Invitation has been ${invitation.status.toLowerCase()}`,
                organization: invitation.organization
                    ? { id: invitation.organizationId, name: invitation.organization.name }
                    : undefined,
                project: null,
                role: invitation.role,
                email: invitation.email,
                expires_at: invitation.expiresAt?.toISOString(),
                status: invitation.status,
            };
        }
        if (new Date() > invitation.expiresAt) {
            await this.invitationsRepo.updateStatus(invitation.id, 'EXPIRED');
            return {
                valid: false,
                reason: 'Invitation has expired',
                organization: invitation.organization
                    ? { id: invitation.organizationId, name: invitation.organization.name }
                    : undefined,
                project: null,
                role: invitation.role,
                email: invitation.email,
                expires_at: invitation.expiresAt?.toISOString(),
                status: 'EXPIRED',
            };
        }
        return {
            valid: true,
            organization: invitation.organization
                ? { id: invitation.organizationId, name: invitation.organization.name }
                : undefined,
            project: null,
            role: invitation.role,
            email: invitation.email,
            expires_at: invitation.expiresAt?.toISOString(),
            status: invitation.status,
        };
    }
    async acceptInvitation(token, userIdOrUser) {
        const { valid, invitation, reason } = await this.validateToken(token);
        if (!valid || !invitation) {
            throw new common_1.BadRequestException(reason ?? 'Invalid invitation');
        }
        const user = typeof userIdOrUser === 'string'
            ? await this.usersService.findById(userIdOrUser)
            : userIdOrUser;
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
            throw new common_1.ForbiddenException('This invitation was sent to a different email address');
        }
        const existing = await this.orgMembersRepo.findByOrganizationAndUser(invitation.organizationId, user.id);
        if (existing) {
            await this.invitationsRepo.updateStatus(invitation.id, 'ACCEPTED');
            return { organizationId: invitation.organizationId };
        }
        await this.orgMembersRepo.create({
            id: (0, uuid_util_1.generateUuid)(),
            organizationId: invitation.organizationId,
            userId: user.id,
            role: invitation.role,
            status: 'ACTIVE',
        });
        await this.invitationsRepo.updateStatus(invitation.id, 'ACCEPTED');
        return { organizationId: invitation.organizationId };
    }
    async cancelInvitation(invitationId, organizationId) {
        const invitation = await this.invitationsRepo.findById(invitationId);
        if (!invitation || invitation.organizationId !== organizationId) {
            throw new common_1.NotFoundException('Invitation not found');
        }
        if (invitation.status !== 'PENDING') {
            throw new common_1.BadRequestException('Only pending invitations can be cancelled');
        }
        await this.invitationsRepo.updateStatus(invitationId, 'CANCELLED');
        const invitedUser = await this.usersService.findByEmail(invitation.email);
        if (invitedUser) {
            const memberships = await this.orgMembersRepo.findByUser(invitedUser.id);
            if (memberships.length === 0) {
                try {
                    await this.usersService.deleteById(invitedUser.id);
                }
                catch {
                }
            }
        }
    }
    async resendInvitation(invitationId, organizationId) {
        const invitation = await this.invitationsRepo.findById(invitationId);
        if (!invitation || invitation.organizationId !== organizationId) {
            throw new common_1.NotFoundException('Invitation not found');
        }
        if (invitation.status !== 'PENDING' && invitation.status !== 'EXPIRED') {
            throw new common_1.BadRequestException('Cannot resend this invitation');
        }
        const newToken = generateToken();
        await this.invitationsRepo.updateTokenAndExpiry(invitationId, newToken, expiresAt());
        const org = await this.orgsService.findById(organizationId);
        const inviter = await this.usersService.findById(invitation.invitedBy);
        const acceptUrl = `${(0, frontend_url_util_1.resolveFrontendPublicUrl)()}/invite/${newToken}`;
        await this.emailService.sendInvitation({
            to: invitation.email,
            organizationName: org?.name ?? 'Unknown Organization',
            inviterName: inviter?.fullName ?? inviter?.email ?? 'A team member',
            role: invitation.role,
            acceptUrl,
        });
        return (await this.invitationsRepo.findById(invitationId));
    }
};
exports.InvitationsService = InvitationsService;
exports.InvitationsService = InvitationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [invitations_repository_1.InvitationsRepository,
        email_service_1.EmailService,
        organizations_service_1.OrganizationsService,
        users_service_1.UsersService,
        organization_members_repository_1.OrganizationMembersRepository])
], InvitationsService);
//# sourceMappingURL=invitations.service.js.map