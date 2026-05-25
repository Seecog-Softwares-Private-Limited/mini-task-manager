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
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const projects_repository_1 = require("./repositories/projects.repository");
const project_members_repository_1 = require("./repositories/project-members.repository");
const tasks_repository_1 = require("../tasks/repositories/tasks.repository");
const workflows_service_1 = require("../workflows/workflows.service");
const activity_logs_service_1 = require("../activity-logs/activity-logs.service");
const DEMO_TASKS = [
    { title: 'Review project requirements', description: 'Go through the initial brief and clarify any questions.' },
    { title: 'Set up development environment', description: 'Install dependencies and configure your local setup.' },
    { title: 'Create first milestone', description: 'Define and document the first project milestone.' },
];
let ProjectsService = class ProjectsService {
    constructor(projectsRepository, projectMembersRepository, tasksRepository, workflowsService, activityLogsService) {
        this.projectsRepository = projectsRepository;
        this.projectMembersRepository = projectMembersRepository;
        this.tasksRepository = tasksRepository;
        this.workflowsService = workflowsService;
        this.activityLogsService = activityLogsService;
    }
    async findById(id) {
        return this.projectsRepository.findById(id);
    }
    async findByIdInOrganization(id, organizationId) {
        return this.projectsRepository.findByIdAndOrganization(id, organizationId);
    }
    async findByOrganization(organizationId) {
        return this.projectsRepository.findByOrganization(organizationId);
    }
    async countByOrganization(organizationId) {
        return this.projectsRepository.countByOrganization(organizationId);
    }
    async create(organizationId, createdBy, dto) {
        const existingProject = await this.projectsRepository.findByName(dto.name, organizationId);
        if (existingProject) {
            throw new common_1.ConflictException('Project name already exists');
        }
        const iconTrimmed = dto.iconUrl?.trim();
        const project = await this.projectsRepository.create({
            organizationId,
            createdBy,
            name: dto.name,
            description: dto.description ?? null,
            iconUrl: iconTrimmed && iconTrimmed.length > 0 ? dto.iconUrl : null,
            visibility: dto.visibility ?? 'PRIVATE',
        });
        this.activityLogsService
            .log({ organizationId, userId: createdBy, entityType: 'project', entityId: project.id, action: 'create', metadata: { name: project.name } })
            .catch(() => { });
        return project;
    }
    async update(id, organizationId, dto, userId) {
        const project = await this.projectsRepository.findByIdAndOrganization(id, organizationId);
        if (!project) {
            throw new common_1.NotFoundException('Project not found');
        }
        const payload = {};
        if (dto.name !== undefined)
            payload.name = dto.name;
        if (dto.description !== undefined)
            payload.description = dto.description ?? null;
        if (dto.iconUrl !== undefined) {
            const v = dto.iconUrl.trim();
            payload.iconUrl = v.length === 0 ? null : dto.iconUrl;
        }
        if (dto.visibility !== undefined)
            payload.visibility = dto.visibility;
        if (dto.isArchived !== undefined)
            payload.isArchived = dto.isArchived;
        if (Object.keys(payload).length === 0)
            return project;
        await this.projectsRepository.update(id, payload);
        const updated = await this.projectsRepository.findByIdAndOrganization(id, organizationId);
        this.activityLogsService
            .log({ organizationId, userId: userId ?? undefined, entityType: 'project', entityId: id, action: 'update', metadata: { name: updated?.name ?? project.name } })
            .catch(() => { });
        return updated;
    }
    async getProjectMembers(projectId) {
        return this.projectMembersRepository.findByProjectWithUser(projectId);
    }
    async addProjectMember(projectId, userId, role) {
        const existing = await this.projectMembersRepository.findByProjectAndUser(projectId, userId);
        if (existing) {
            throw new common_1.ConflictException('User is already a member of this project');
        }
        const member = await this.projectMembersRepository.create({ projectId, userId, role });
        const withUser = await this.projectMembersRepository.findById(member.id);
        return withUser ?? member;
    }
    async updateProjectMemberRole(memberId, role) {
        const member = await this.projectMembersRepository.findById(memberId);
        if (!member)
            throw new common_1.NotFoundException('Project member not found');
        await this.projectMembersRepository.updateRole(memberId, role);
        return { ...member, role };
    }
    async removeProjectMember(memberId) {
        const member = await this.projectMembersRepository.findById(memberId);
        if (!member)
            throw new common_1.NotFoundException('Project member not found');
        await this.projectMembersRepository.delete(memberId);
    }
    async seedDemoTasks(projectId, organizationId, reporterId) {
        const project = await this.projectsRepository.findByIdAndOrganization(projectId, organizationId);
        if (!project) {
            throw new common_1.NotFoundException('Project not found');
        }
        const count = await this.tasksRepository.countByProject(projectId);
        if (count > 0) {
            return { created: 0 };
        }
        const workflows = await this.workflowsService.findByProject(projectId, organizationId);
        const defaultWorkflow = workflows.find((w) => w.isDefault) ?? workflows[0];
        if (!defaultWorkflow) {
            return { created: 0 };
        }
        const statuses = await this.workflowsService.getStatuses(defaultWorkflow.id);
        const todoStatus = statuses.find((s) => s.type === 'TODO') ?? statuses[0];
        const statusId = todoStatus?.id ?? null;
        let created = 0;
        for (const demo of DEMO_TASKS) {
            await this.tasksRepository.create({
                projectId,
                organizationId,
                reporterId,
                title: demo.title,
                description: demo.description,
                statusId,
                priority: 'MEDIUM',
            });
            created++;
        }
        return { created };
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => tasks_repository_1.TasksRepository))),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => workflows_service_1.WorkflowsService))),
    __metadata("design:paramtypes", [projects_repository_1.ProjectsRepository,
        project_members_repository_1.ProjectMembersRepository,
        tasks_repository_1.TasksRepository,
        workflows_service_1.WorkflowsService,
        activity_logs_service_1.ActivityLogsService])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map