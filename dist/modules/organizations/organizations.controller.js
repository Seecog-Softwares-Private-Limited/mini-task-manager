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
exports.OrganizationsController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const throttler_1 = require("@nestjs/throttler");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const roles_guard_1 = require("../auth/guards/roles.guard");
const tenant_guard_1 = require("../auth/guards/tenant.guard");
const organizations_service_1 = require("./organizations.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const create_organization_dto_1 = require("./dto/create-organization.dto");
const update_organization_dto_1 = require("./dto/update-organization.dto");
let OrganizationsController = class OrganizationsController {
    constructor(organizationsService) {
        this.organizationsService = organizationsService;
    }
    async list(userId) {
        const items = await this.organizationsService.findOrganizationsWithRoleForUser(userId);
        return items.map(({ org, role }) => this.toResponse(org, role));
    }
    async checkSlugAvailable(slug) {
        const trimmed = typeof slug === 'string' ? slug.trim().toLowerCase() : '';
        if (!trimmed || !/^[a-z0-9-]+$/.test(trimmed)) {
            return { available: false };
        }
        const existing = await this.organizationsService.findBySlug(trimmed);
        return { available: !existing };
    }
    async create(dto, ownerId) {
        const org = await this.organizationsService.create(ownerId, dto);
        return this.toResponse(org, 'owner');
    }
    async getWorkspaceProgress(id, userId, orgIdHeader) {
        const headerOrgId = orgIdHeader?.trim();
        if (!headerOrgId || headerOrgId !== id) {
            throw new common_1.ForbiddenException('X-Organization-Id header is required and must match the requested organization id');
        }
        const canAccess = await this.organizationsService.canAccess(id, userId);
        if (!canAccess) {
            throw new common_1.ForbiddenException('You do not have access to this organization');
        }
        return this.organizationsService.getWorkspaceProgress(id);
    }
    async getMemberCount(id, userId, orgIdHeader) {
        const headerOrgId = orgIdHeader?.trim();
        if (!headerOrgId || headerOrgId !== id) {
            throw new common_1.ForbiddenException('X-Organization-Id header is required and must match the requested organization id');
        }
        const canAccess = await this.organizationsService.canAccess(id, userId);
        if (!canAccess) {
            throw new common_1.ForbiddenException('You do not have access to this organization');
        }
        const count = await this.organizationsService.getMemberCount(id);
        return { count };
    }
    async getMembers(id, userId, orgIdHeader) {
        const headerOrgId = orgIdHeader?.trim();
        if (!headerOrgId || headerOrgId !== id) {
            throw new common_1.ForbiddenException('X-Organization-Id header is required and must match the requested organization id');
        }
        const canAccess = await this.organizationsService.canAccess(id, userId);
        if (!canAccess) {
            throw new common_1.ForbiddenException('You do not have access to this organization');
        }
        const members = await this.organizationsService.getMembers(id);
        return members.map((m) => this.toMemberResponse(m));
    }
    async updateMemberRole(id, memberId, body, userId, orgIdHeader) {
        const headerOrgId = orgIdHeader?.trim();
        if (!headerOrgId || headerOrgId !== id) {
            throw new common_1.ForbiddenException('X-Organization-Id header is required and must match the requested organization');
        }
        const updated = await this.organizationsService.updateMemberRole(id, memberId, body.role, userId);
        return this.toMemberResponse(updated);
    }
    async removeMember(id, memberId, userId, orgIdHeader) {
        const headerOrgId = orgIdHeader?.trim();
        if (!headerOrgId || headerOrgId !== id) {
            throw new common_1.ForbiddenException('X-Organization-Id header is required and must match the requested organization');
        }
        await this.organizationsService.removeMember(id, memberId, userId);
        return { success: true };
    }
    async update(id, dto, userId, orgIdHeader) {
        const headerOrgId = orgIdHeader?.trim();
        if (!headerOrgId || headerOrgId !== id) {
            throw new common_1.ForbiddenException('X-Organization-Id must match the requested organization');
        }
        const canAccess = await this.organizationsService.canAccess(id, userId);
        if (!canAccess) {
            throw new common_1.ForbiddenException('You do not have access to this organization');
        }
        if (dto.isArchived !== undefined) {
            const membership = await this.organizationsService.getMembership(id, userId);
            if (membership?.role?.toLowerCase() !== 'owner') {
                throw new common_1.ForbiddenException('Only the organization owner can archive or restore the organization');
            }
        }
        const org = await this.organizationsService.update(id, dto);
        if (!org)
            throw new common_1.ForbiddenException('Organization not found');
        const membership = await this.organizationsService.getMembership(org.id, userId);
        return this.toResponse(org, membership?.role);
    }
    async delete(id, userId, orgIdHeader) {
        const headerOrgId = orgIdHeader?.trim();
        if (!headerOrgId || headerOrgId !== id) {
            throw new common_1.ForbiddenException('X-Organization-Id must match the requested organization');
        }
        await this.organizationsService.delete(id, userId);
        return { success: true };
    }
    async findOne(id, userId, orgIdHeader) {
        if (!orgIdHeader || orgIdHeader !== id) {
            throw new common_1.ForbiddenException('X-Organization-Id must match the requested organization');
        }
        const canAccess = await this.organizationsService.canAccess(id, userId);
        if (!canAccess) {
            throw new common_1.ForbiddenException('You do not have access to this organization');
        }
        const org = await this.organizationsService.findById(id);
        if (!org)
            return null;
        const membership = await this.organizationsService.getMembership(org.id, userId);
        return this.toResponse(org, membership?.role);
    }
    toResponse(org, myRole) {
        return {
            id: org.id,
            name: org.name,
            slug: org.slug,
            ownerId: org.ownerId,
            logoUrl: org.logoUrl ?? undefined,
            myRole: myRole ?? undefined,
            isArchived: org.isArchived ?? false,
        };
    }
    toMemberResponse(m) {
        return {
            id: m.id,
            organizationId: m.organizationId,
            userId: m.userId,
            role: m.role,
            status: m.status,
            joinedAt: m.joinedAt,
            user: m.user
                ? {
                    id: m.user.id,
                    fullName: m.user.fullName,
                    email: m.user.email,
                    avatarUrl: m.user.avatarUrl ?? undefined,
                    lastSeenAt: m.user.lastSeenAt ? m.user.lastSeenAt.toISOString() : undefined,
                }
                : undefined,
        };
    }
};
exports.OrganizationsController = OrganizationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('slug/available'),
    __param(0, (0, common_1.Query)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "checkSlugAvailable", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_organization_dto_1.CreateOrganizationDto, String]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id/workspace-progress'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUserId)()),
    __param(2, (0, common_1.Headers)('x-organization-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "getWorkspaceProgress", null);
__decorate([
    (0, common_1.Get)(':id/members/count'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUserId)()),
    __param(2, (0, common_1.Headers)('x-organization-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "getMemberCount", null);
__decorate([
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    (0, common_1.Get)(':id/members'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUserId)()),
    __param(2, (0, common_1.Headers)('x-organization-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "getMembers", null);
__decorate([
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    (0, common_1.Patch)(':id/members/:memberId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('memberId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUserId)()),
    __param(4, (0, common_1.Headers)('x-organization-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, String, String]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "updateMemberRole", null);
__decorate([
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    (0, common_1.Delete)(':id/members/:memberId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('memberId')),
    __param(2, (0, current_user_decorator_1.CurrentUserId)()),
    __param(3, (0, common_1.Headers)('x-organization-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "removeMember", null);
__decorate([
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUserId)()),
    __param(3, (0, common_1.Headers)('x-organization-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_organization_dto_1.UpdateOrganizationDto, String, String]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUserId)()),
    __param(2, (0, common_1.Headers)('x-organization-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "delete", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUserId)()),
    __param(2, (0, common_1.Headers)('x-organization-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "findOne", null);
exports.OrganizationsController = OrganizationsController = __decorate([
    (0, common_1.Controller)('organizations'),
    (0, throttler_1.SkipThrottle)({ auth: true }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [organizations_service_1.OrganizationsService])
], OrganizationsController);
//# sourceMappingURL=organizations.controller.js.map