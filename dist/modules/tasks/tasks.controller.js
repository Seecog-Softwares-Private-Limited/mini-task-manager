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
exports.TasksController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const tasks_service_1 = require("./tasks.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const tenant_guard_1 = require("../auth/guards/tenant.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const create_task_dto_1 = require("./dto/create-task.dto");
const patch_task_dto_1 = require("./dto/patch-task.dto");
const pagination_1 = require("../../common/pagination");
let TasksController = class TasksController {
    constructor(tasksService) {
        this.tasksService = tasksService;
    }
    async create(dto, reporterId) {
        const projectId = dto.projectId;
        const organizationId = dto.organizationId;
        const task = await this.tasksService.create(projectId, organizationId, reporterId, dto);
        return this.toResponse(task);
    }
    async findByProject(projectId, tenantId, query) {
        return this.tasksService.findByProject(projectId, tenantId, query);
    }
    async findOne(id, tenantId) {
        const task = await this.tasksService.findByIdInOrganization(id, tenantId);
        if (!task)
            return null;
        return this.toResponse(task);
    }
    async update(id, tenantId, dto) {
        const task = await this.tasksService.update(id, tenantId, dto);
        if (!task)
            return null;
        return this.toResponse(task);
    }
    toResponse(t) {
        return {
            id: t.id,
            projectId: t.projectId,
            organizationId: t.organizationId,
            title: t.title,
            description: t.description ?? undefined,
            statusId: t.statusId ?? undefined,
            priority: t.priority,
            assigneeId: t.assigneeId ?? undefined,
            assigneeIds: t.assigneeIds ?? (t.assigneeId ? [t.assigneeId] : undefined),
            reporterId: t.reporterId,
            parentTaskId: t.parentTaskId ?? undefined,
            storyPoints: t.storyPoints ?? undefined,
            dueDate: t.dueDate ?? undefined,
            estimatedMinutes: t.estimatedMinutes ?? undefined,
            loggedMinutes: t.loggedMinutes,
            sprintId: t.sprintId ?? undefined,
            subtasks: t.subtasks ?? undefined,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
        };
    }
};
exports.TasksController = TasksController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_task_dto_1.CreateTaskDto, String]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('project/:projectId'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, pagination_1.PaginationQueryDto]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "findByProject", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, patch_task_dto_1.PatchTaskDto]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "update", null);
exports.TasksController = TasksController = __decorate([
    (0, common_1.Controller)('tasks'),
    (0, throttler_1.SkipThrottle)({ auth: true }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [tasks_service_1.TasksService])
], TasksController);
//# sourceMappingURL=tasks.controller.js.map