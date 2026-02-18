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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvitationsController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const invitations_service_1 = require("./invitations.service");
const organizations_service_1 = require("../organizations/organizations.service");
const create_invitation_dto_1 = require("./dto/create-invitation.dto");
const accept_invitation_dto_1 = require("./dto/accept-invitation.dto");
let InvitationsController = class InvitationsController {
    constructor(invitationsService, orgsService) {
        this.invitationsService = invitationsService;
        this.orgsService = orgsService;
    }
    async create(orgId, dto, userId, orgIdHeader) {
        const headerOrgId = orgIdHeader?.trim();
        if (!headerOrgId || headerOrgId !== orgId) {
            throw new common_1.ForbiddenException('X-Organization-Id must match the requested organization');
        }
        const canAccess = await this.orgsService.canAccess(orgId, userId);
        if (!canAccess) {
            throw new common_1.ForbiddenException('You do not have access to this organization');
        }
        const invitation = await this.invitationsService.createInvitation(orgId, dto.email, dto.role, userId);
        return this.toResponse(invitation);
    }
    async list(orgId, userId, orgIdHeader) {
        const headerOrgId = orgIdHeader?.trim();
        if (!headerOrgId || headerOrgId !== orgId) {
            throw new common_1.ForbiddenException('X-Organization-Id must match the requested organization');
        }
        const canAccess = await this.orgsService.canAccess(orgId, userId);
        if (!canAccess) {
            throw new common_1.ForbiddenException('You do not have access to this organization');
        }
        const invitations = await this.invitationsService.listByOrganization(orgId);
        return invitations.map((inv) => this.toResponse(inv));
    }
    async resend(orgId, invId, userId, orgIdHeader) {
        const headerOrgId = orgIdHeader?.trim();
        if (!headerOrgId || headerOrgId !== orgId) {
            throw new common_1.ForbiddenException('X-Organization-Id must match the requested organization');
        }
        const canAccess = await this.orgsService.canAccess(orgId, userId);
        if (!canAccess) {
            throw new common_1.ForbiddenException('You do not have access to this organization');
        }
        const invitation = await this.invitationsService.resendInvitation(invId, orgId);
        return this.toResponse(invitation);
    }
    async cancel(orgId, invId, userId, orgIdHeader) {
        const headerOrgId = orgIdHeader?.trim();
        if (!headerOrgId || headerOrgId !== orgId) {
            throw new common_1.ForbiddenException('X-Organization-Id must match the requested organization');
        }
        const canAccess = await this.orgsService.canAccess(orgId, userId);
        if (!canAccess) {
            throw new common_1.ForbiddenException('You do not have access to this organization');
        }
        await this.invitationsService.cancelInvitation(invId, orgId);
        return { success: true };
    }
    async validateQuery(token) {
        if (!token) {
            return { valid: false, reason: 'Token is required' };
        }
        const result = await this.invitationsService.validateToken(token);
        if (!result.valid) {
            return { valid: false, reason: result.reason };
        }
        return {
            valid: true,
            email: result.invitation.email,
            organizationName: result.invitation.organization?.name ?? 'Unknown',
            role: result.invitation.role,
        };
    }
    async validatePath(token) {
        const result = await this.invitationsService.validateTokenEnriched(token);
        if (!result.valid) {
            return result;
        }
        return result;
    }
    async accept(dto, userId) {
        const result = await this.invitationsService.acceptInvitation(dto.token, userId);
        return { success: true, organizationId: result.organizationId };
    }
    async acceptByPath(token, userId) {
        const result = await this.invitationsService.acceptInvitation(token, userId);
        return { success: true, organizationId: result.organizationId };
    }
    toResponse(inv) {
        return {
            id: inv.id,
            organizationId: inv.organizationId,
            email: inv.email,
            role: inv.role,
            status: inv.status,
            expiresAt: inv.expiresAt,
            createdAt: inv.createdAt,
            inviter: inv.inviter
                ? {
                    id: inv.inviter.id,
                    fullName: inv.inviter.fullName,
                    email: inv.inviter.email,
                }
                : undefined,
        };
    }
};
exports.InvitationsController = InvitationsController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('organizations/:id/invitations'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUserId)()),
    __param(3, (0, common_1.Headers)('x-organization-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_invitation_dto_1.CreateInvitationDto, String, String]),
    __metadata("design:returntype", Promise)
], InvitationsController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('organizations/:id/invitations'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUserId)()),
    __param(2, (0, common_1.Headers)('x-organization-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], InvitationsController.prototype, "list", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('organizations/:id/invitations/:invId/resend'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('invId')),
    __param(2, (0, current_user_decorator_1.CurrentUserId)()),
    __param(3, (0, common_1.Headers)('x-organization-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], InvitationsController.prototype, "resend", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)('organizations/:id/invitations/:invId/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('invId')),
    __param(2, (0, current_user_decorator_1.CurrentUserId)()),
    __param(3, (0, common_1.Headers)('x-organization-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], InvitationsController.prototype, "cancel", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('invitations/validate'),
    __param(0, (0, common_1.Query)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InvitationsController.prototype, "validateQuery", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('invitations/validate/:token'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InvitationsController.prototype, "validatePath", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('invitations/accept'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [accept_invitation_dto_1.AcceptInvitationDto, String]),
    __metadata("design:returntype", Promise)
], InvitationsController.prototype, "accept", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('invitations/accept/:token'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, current_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InvitationsController.prototype, "acceptByPath", null);
exports.InvitationsController = InvitationsController = __decorate([
    (0, common_1.Controller)(),
    (0, throttler_1.SkipThrottle)({ auth: true }),
    __metadata("design:paramtypes", [invitations_service_1.InvitationsService,
        organizations_service_1.OrganizationsService])
], InvitationsController);
//# sourceMappingURL=invitations.controller.js.map