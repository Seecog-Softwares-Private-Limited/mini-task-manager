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
const organizations_service_1 = require("../organizations/organizations.service");
const notifications_service_1 = require("../notifications/notifications.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const tenant_guard_1 = require("../auth/guards/tenant.guard");
const subscription_guard_1 = require("../billing/guards/subscription.guard");
const check_limit_decorator_1 = require("../billing/decorators/check-limit.decorator");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const create_project_dto_1 = require("./dto/create-project.dto");
const update_project_dto_1 = require("./dto/update-project.dto");
const add_project_member_dto_1 = require("./dto/add-project-member.dto");
const update_project_member_role_dto_1 = require("./dto/update-project-member-role.dto");
let ProjectsController = ProjectsController_1 = class ProjectsController {
    constructor(projectsService, workflowsService, organizationsService, notificationsService) {
        this.projectsService = projectsService;
        this.workflowsService = workflowsService;
        this.organizationsService = organizationsService;
        this.notificationsService = notificationsService;
        this.logger = new common_1.Logger(ProjectsController_1.name);
    }
    async create(dto, tenantId, createdBy) {
        const project = await this.projectsService.create(tenantId, createdBy, dto);
        try {
            await this.workflowsService.createDefaultWorkflow(project.id, tenantId);
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
    async getCount(tenantId) {
        const count = await this.projectsService.countByOrganization(tenantId);
        return { count };
    }
    async getTemplates() {
        return [
            { id: 'blank', name: 'Blank', description: 'Start with an empty project' },
            { id: 'kanban', name: 'Kanban', description: 'To Do, In Progress, Done workflow' },
            { id: 'product', name: 'Product Development', description: 'Ideas, Backlog, In Progress, Review, Done' },
        ];
    }
    async getMembers(projectId, tenantId) {
        const projectMembers = await this.projectsService.getProjectMembers(projectId);
        if (projectMembers.length > 0) {
            return projectMembers.map((m) => this.toMemberResponse(m));
        }
        if (tenantId) {
            const orgMembers = await this.organizationsService.getMembers(tenantId);
            return orgMembers
                .filter((om) => om.status === 'ACTIVE')
                .map((om) => ({
                id: om.id,
                projectId,
                userId: om.userId,
                role: om.role,
                user: om.user
                    ? {
                        id: om.user.id,
                        fullName: om.user.fullName,
                        email: om.user.email,
                        avatarUrl: om.user.avatarUrl ?? undefined,
                    }
                    : undefined,
            }));
        }
        return [];
    }
    async addMember(projectId, dto, addedByUserId) {
        const member = await this.projectsService.addProjectMember(projectId, dto.userId, dto.role);
        const project = await this.projectsService.findById(projectId);
        if (project && dto.userId !== addedByUserId) {
            this.notificationsService
                .createNotification(dto.userId, 'Added to project', `You were added to "${project.name}".`)
                .catch((err) => this.logger.warn(`Notification failed: ${err}`));
        }
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
    async seedDemoTasks(projectId, tenantId, userId) {
        return this.projectsService.seedDemoTasks(projectId, tenantId, userId);
    }
    async findOne(id, tenantId) {
        const project = await this.projectsService.findByIdInOrganization(id, tenantId);
        if (!project)
            return null;
        return this.toResponse(project);
    }
    async update(id, dto, tenantId, userId) {
        const project = await this.projectsService.update(id, tenantId, dto, userId);
        return this.toResponse(project);
    }
    toResponse(p) {
        const entity = p;
        return {
            id: p.id,
            organizationId: p.organizationId,
            name: p.name,
            description: p.description ?? undefined,
            iconUrl: p.iconUrl ?? undefined,
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
    (0, common_1.UseGuards)(subscription_guard_1.SubscriptionGuard),
    (0, check_limit_decorator_1.CheckSubscriptionLimit)('projects'),
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
    (0, common_1.Get)('count'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "getCount", null);
__decorate([
    (0, common_1.Get)('templates'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "getTemplates", null);
__decorate([
    (0, common_1.Get)(':id/members'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "getMembers", null);
__decorate([
    (0, common_1.Post)(':id/members'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, add_project_member_dto_1.AddProjectMemberDto, String]),
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
    (0, common_1.Post)(':id/seed-demo-tasks'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, current_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "seedDemoTasks", null);
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
    __param(3, (0, current_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_project_dto_1.UpdateProjectDto, String, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "update", null);
exports.ProjectsController = ProjectsController = ProjectsController_1 = __decorate([
    (0, common_1.Controller)('projects'),
    (0, throttler_1.SkipThrottle)({ auth: true }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [projects_service_1.ProjectsService,
        workflows_service_1.WorkflowsService,
        organizations_service_1.OrganizationsService,
        notifications_service_1.NotificationsService])
], ProjectsController);
//# sourceMappingURL=projects.controller.js.map