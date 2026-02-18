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
var ProjectsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const projects_service_1 = require("./projects.service");
const workflows_service_1 = require("../workflows/workflows.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const tenant_guard_1 = require("../auth/guards/tenant.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const create_project_dto_1 = require("./dto/create-project.dto");
const update_project_dto_1 = require("./dto/update-project.dto");
const add_project_member_dto_1 = require("./dto/add-project-member.dto");
const update_project_member_role_dto_1 = require("./dto/update-project-member-role.dto");
let ProjectsController = ProjectsController_1 = class ProjectsController {
    constructor(projectsService, workflowsService) {
        this.projectsService = projectsService;
        this.workflowsService = workflowsService;
        this.logger = new common_1.Logger(ProjectsController_1.name);
    }
    async create(dto, tenantId, createdBy) {
        const project = await this.projectsService.create(tenantId, createdBy, dto);
        try {
            await this.workflowsService.createDefaultWorkflow(project.id);
        }
        catch (err) {
            this.logger.warn(`Failed to auto-create default workflow for project ${project.id}: ${err}`);
        }
        return this.toResponse(project);
    }
    async findAll(tenantId) {
        const list = await this.projectsService.findByOrganization(tenantId);
        return list.map((p) => this.toResponse(p));
    }
    async getMembers(projectId) {
        const members = await this.projectsService.getProjectMembers(projectId);
        return members.map((m) => this.toMemberResponse(m));
    }
    async addMember(projectId, dto) {
        const member = await this.projectsService.addProjectMember(projectId, dto.userId, dto.role);
        return this.toMemberResponse(member);
    }
    async updateMemberRole(memberId, dto) {
        const member = await this.projectsService.updateProjectMemberRole(memberId, dto.role);
        return this.toMemberResponse(member);
    }
    async removeMember(memberId) {
        await this.projectsService.removeProjectMember(memberId);
        return { success: true };
    }
    async findOne(id, tenantId) {
        const project = await this.projectsService.findByIdInOrganization(id, tenantId);
        if (!project)
            return null;
        return this.toResponse(project);
    }
    async update(id, dto, tenantId) {
        const project = await this.projectsService.update(id, tenantId, dto);
        return this.toResponse(project);
    }
    toResponse(p) {
        const entity = p;
        return {
            id: p.id,
            organizationId: p.organizationId,
            name: p.name,
            description: p.description ?? undefined,
            visibility: p.visibility,
            isArchived: p.isArchived,
            createdBy: p.createdBy,
            createdAt: entity.createdAt?.toISOString?.() ?? new Date().toISOString(),
            updatedAt: entity.updatedAt?.toISOString?.() ?? new Date().toISOString(),
        };
    }
    toMemberResponse(m) {
        return {
            id: m.id,
            projectId: m.projectId,
            userId: m.userId,
            role: m.role,
            user: m.user
                ? {
                    id: m.user.id,
                    fullName: m.user.fullName,
                    email: m.user.email,
                    avatarUrl: m.user.avatarUrl ?? undefined,
                }
                : undefined,
        };
    }
};
exports.ProjectsController = ProjectsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, current_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_project_dto_1.CreateProjectDto, String, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id/members'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "getMembers", null);
__decorate([
    (0, common_1.Post)(':id/members'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, add_project_member_dto_1.AddProjectMemberDto]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "addMember", null);
__decorate([
    (0, common_1.Patch)(':id/members/:memberId'),
    __param(0, (0, common_1.Param)('memberId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_project_member_role_dto_1.UpdateProjectMemberRoleDto]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "updateMemberRole", null);
__decorate([
    (0, common_1.Delete)(':id/members/:memberId'),
    __param(0, (0, common_1.Param)('memberId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "removeMember", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_project_dto_1.UpdateProjectDto, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "update", null);
exports.ProjectsController = ProjectsController = ProjectsController_1 = __decorate([
    (0, common_1.Controller)('projects'),
    (0, throttler_1.SkipThrottle)({ auth: true }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [projects_service_1.ProjectsService,
        workflows_service_1.WorkflowsService])
], ProjectsController);
//# sourceMappingURL=projects.controller.js.map