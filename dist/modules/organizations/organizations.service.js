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
exports.OrganizationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const typeorm_3 = require("typeorm");
const organizations_repository_1 = require("./repositories/organizations.repository");
const organization_members_repository_1 = require("./repositories/organization-members.repository");
const organization_entity_1 = require("./entities/organization.entity");
const organization_member_entity_1 = require("./entities/organization-member.entity");
const uuid_util_1 = require("../../common/utils/uuid.util");
let OrganizationsService = class OrganizationsService {
    constructor(organizationsRepository, orgMembersRepository, dataSource) {
        this.organizationsRepository = organizationsRepository;
        this.orgMembersRepository = orgMembersRepository;
        this.dataSource = dataSource;
    }
    async findById(id) {
        return this.organizationsRepository.findById(id);
    }
    async findBySlug(slug) {
        return this.organizationsRepository.findBySlug(slug);
    }
    async findOrganizationsForUser(userId) {
        const memberships = await this.orgMembersRepository.findByUser(userId);
        const orgs = [];
        for (const m of memberships) {
            const org = await this.organizationsRepository.findById(m.organizationId);
            if (org)
                orgs.push(org);
        }
        return orgs;
    }
    async findOrganizationsWithRoleForUser(userId) {
        const memberships = await this.orgMembersRepository.findByUser(userId);
        const result = [];
        for (const m of memberships) {
            if (m.status !== 'ACTIVE')
                continue;
            const org = await this.organizationsRepository.findById(m.organizationId);
            if (org)
                result.push({ org, role: m.role });
        }
        return result;
    }
    async create(ownerId, dto) {
        const existing = await this.organizationsRepository.findBySlug(dto.slug);
        if (existing) {
            throw new common_1.ConflictException('An organization with this slug already exists. Please choose a different slug.');
        }
        const orgId = (0, uuid_util_1.generateUuid)();
        try {
            return await this.dataSource.transaction(async (manager) => {
                const orgRepo = manager.getRepository(organization_entity_1.OrganizationEntity);
                const memberRepo = manager.getRepository(organization_member_entity_1.OrganizationMemberEntity);
                const orgEntity = orgRepo.create({
                    id: orgId,
                    name: dto.name,
                    slug: dto.slug,
                    ownerId,
                    logoUrl: dto.logoUrl ?? null,
                    isArchived: false,
                });
                await orgRepo.save(orgEntity);
                const memberEntity = memberRepo.create({
                    id: (0, uuid_util_1.generateUuid)(),
                    organizationId: orgId,
                    userId: ownerId,
                    role: 'owner',
                    status: 'ACTIVE',
                });
                await memberRepo.save(memberEntity);
                return orgEntity;
            });
        }
        catch (err) {
            const driverError = err instanceof typeorm_3.QueryFailedError ? err.driverError : null;
            const isDup = (driverError && driverError.code === 'ER_DUP_ENTRY') ||
                (driverError && driverError.errno === 1062) ||
                (err instanceof Error && err.message.includes('Duplicate entry'));
            if (isDup) {
                throw new common_1.ConflictException('An organization with this slug already exists. Please choose a different slug.');
            }
            throw err;
        }
    }
    async getMembers(organizationId) {
        return this.orgMembersRepository.findByOrganizationWithUser(organizationId);
    }
    async getMemberCount(organizationId) {
        return this.orgMembersRepository.countByOrganization(organizationId);
    }
    async canAccess(organizationId, userId) {
        const membership = await this.orgMembersRepository.findByOrganizationAndUser(organizationId, userId);
        return membership != null && membership.status === 'ACTIVE';
    }
    async update(id, dto) {
        const org = await this.organizationsRepository.findById(id);
        if (!org)
            return null;
        if (dto.isArchived !== undefined) {
            await this.organizationsRepository.update(id, { isArchived: dto.isArchived });
            return { ...org, isArchived: dto.isArchived };
        }
        return org;
    }
    async getMembership(organizationId, userId) {
        const m = await this.orgMembersRepository.findByOrganizationAndUser(organizationId, userId);
        return m && m.status === 'ACTIVE' ? m : null;
    }
    async getWorkspaceProgress(organizationId) {
        const [projectCount] = await this.dataSource.query(`SELECT COUNT(*) as cnt FROM projects WHERE organization_id = ?`, [organizationId]);
        const [memberCount] = await this.dataSource.query(`SELECT COUNT(*) as cnt FROM organization_members WHERE organization_id = ? AND status = 'ACTIVE'`, [organizationId]);
        const [taskCount] = await this.dataSource.query(`SELECT COUNT(*) as cnt FROM tasks WHERE organization_id = ?`, [organizationId]);
        return {
            hasProjects: Number(projectCount?.cnt ?? 0) > 0,
            hasMembers: Number(memberCount?.cnt ?? 0) > 1,
            hasTasks: Number(taskCount?.cnt ?? 0) > 0,
        };
    }
    async updateMemberRole(organizationId, memberId, role, actorUserId) {
        const membership = await this.getMembership(organizationId, actorUserId);
        if (!membership) {
            throw new common_1.ForbiddenException('You do not have access to this organization');
        }
        const actorRole = membership.role?.toLowerCase();
        if (actorRole !== 'owner' && actorRole !== 'admin') {
            throw new common_1.ForbiddenException('Only owners and admins can update member roles');
        }
        const target = await this.orgMembersRepository.findById(memberId);
        if (!target) {
            throw new common_1.ForbiddenException('Member not found');
        }
        if (target.organizationId !== organizationId) {
            throw new common_1.ForbiddenException('Member does not belong to this organization');
        }
        if (target.role?.toLowerCase() === 'owner') {
            throw new common_1.ForbiddenException('Cannot change the owner role. Use transfer ownership instead.');
        }
        if (actorRole === 'admin' && target.role?.toLowerCase() === 'owner') {
            throw new common_1.ForbiddenException('Admins cannot modify the owner');
        }
        const normalizedRole = role?.trim().toLowerCase() || 'member';
        const allowedRoles = ['admin', 'member'];
        if (!allowedRoles.includes(normalizedRole)) {
            throw new common_1.ForbiddenException('Invalid role. Use admin or member.');
        }
        await this.orgMembersRepository.update(memberId, { role: normalizedRole });
        const updated = await this.orgMembersRepository.findById(memberId);
        if (!updated)
            throw new common_1.ForbiddenException('Member not found');
        return updated;
    }
    async removeMember(organizationId, memberId, actorUserId) {
        const membership = await this.getMembership(organizationId, actorUserId);
        if (!membership) {
            throw new common_1.ForbiddenException('You do not have access to this organization');
        }
        const actorRole = membership.role?.toLowerCase();
        if (actorRole !== 'owner' && actorRole !== 'admin') {
            throw new common_1.ForbiddenException('Only owners and admins can remove members');
        }
        const target = await this.orgMembersRepository.findById(memberId);
        if (!target) {
            throw new common_1.ForbiddenException('Member not found');
        }
        if (target.organizationId !== organizationId) {
            throw new common_1.ForbiddenException('Member does not belong to this organization');
        }
        if (target.role?.toLowerCase() === 'owner') {
            throw new common_1.ForbiddenException('Cannot remove the owner. Use transfer ownership first.');
        }
        await this.orgMembersRepository.update(memberId, { status: 'REMOVED' });
    }
    async delete(id, userId) {
        const membership = await this.getMembership(id, userId);
        if (!membership) {
            throw new common_1.ForbiddenException('You do not have access to this organization');
        }
        if (membership.role?.toLowerCase() !== 'owner') {
            throw new common_1.ForbiddenException('Only the organization owner can delete the organization');
        }
        await this.organizationsRepository.delete(id);
    }
};
exports.OrganizationsService = OrganizationsService;
exports.OrganizationsService = OrganizationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [organizations_repository_1.OrganizationsRepository,
        organization_members_repository_1.OrganizationMembersRepository,
        typeorm_2.DataSource])
], OrganizationsService);
//# sourceMappingURL=organizations.service.js.map