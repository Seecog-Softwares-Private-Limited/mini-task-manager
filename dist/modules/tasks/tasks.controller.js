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
var TasksController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const throttler_1 = require("@nestjs/throttler");
const fs_1 = require("fs");
const tasks_service_1 = require("./tasks.service");
const email_service_1 = require("../invitations/email.service");
const users_service_1 = require("../users/users.service");
const projects_service_1 = require("../projects/projects.service");
const notifications_service_1 = require("../notifications/notifications.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const tenant_guard_1 = require("../auth/guards/tenant.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const create_task_dto_1 = require("./dto/create-task.dto");
const create_task_comment_dto_1 = require("./dto/create-task-comment.dto");
const patch_task_dto_1 = require("./dto/patch-task.dto");
const pagination_1 = require("../../common/pagination");
let TasksController = TasksController_1 = class TasksController {
    constructor(tasksService, emailService, usersService, projectsService, notificationsService) {
        this.tasksService = tasksService;
        this.emailService = emailService;
        this.usersService = usersService;
        this.projectsService = projectsService;
        this.notificationsService = notificationsService;
        this.logger = new common_1.Logger(TasksController_1.name);
    }
    async create(dto, reporterId) {
        const projectId = dto.projectId;
        const organizationId = dto.organizationId;
        const task = await this.tasksService.create(projectId, organizationId, reporterId, dto);
        const assigneeIds = task.assigneeIds ?? (task.assigneeId ? [task.assigneeId] : []);
        if (assigneeIds.length > 0) {
            this.notifyAssignees(assigneeIds, reporterId, task.title, task.id, projectId).catch((err) => this.logger.warn(`Failed to send assignment notifications: ${err}`));
        }
        return this.toResponse(task);
    }
    async findByProject(projectId, tenantId, query) {
        return this.tasksService.findByProject(projectId, tenantId, query);
    }
    async getAttachmentFile(attachmentId, tenantId) {
        const { path: filePath, fileName } = await this.tasksService.getAttachmentFile(attachmentId, tenantId);
        const stream = (0, fs_1.createReadStream)(filePath);
        return new common_1.StreamableFile(stream, {
            disposition: fileName ? `attachment; filename="${fileName}"` : undefined,
        });
    }
    async getAttachments(taskId, tenantId) {
        const task = await this.tasksService.findByIdInOrganization(taskId, tenantId);
        if (!task)
            return [];
        return this.tasksService.getAttachments(taskId);
    }
    async uploadAttachment(taskId, tenantId, userId, file) {
        if (!file)
            throw new common_1.BadRequestException('File is required');
        return this.tasksService.addAttachment(taskId, tenantId, userId, file);
    }
    async deleteAttachment(taskId, attachmentId, tenantId) {
        await this.tasksService.deleteAttachment(taskId, attachmentId, tenantId);
        return { success: true };
    }
    async getComments(taskId, tenantId) {
        const task = await this.tasksService.findByIdInOrganization(taskId, tenantId);
        if (!task)
            return [];
        const comments = await this.tasksService.getComments(taskId);
        return comments.map((c) => this.toCommentResponse(c));
    }
    async addComment(taskId, tenantId, userId, dto) {
        const comment = await this.tasksService.addComment(taskId, tenantId, userId, dto.body);
        if (comment) {
            const task = await this.tasksService.findByIdInOrganization(taskId, tenantId);
            if (task) {
                this.notifyCommentObservers(task, userId, dto.mentionedUserIds ?? []).catch((err) => this.logger.warn(`Comment notification failed: ${err}`));
            }
            return this.toCommentResponse(comment);
        }
        return null;
    }
    async deleteComment(taskId, commentId, tenantId) {
        await this.tasksService.deleteComment(taskId, commentId, tenantId);
        return { success: true };
    }
    async findOne(id, tenantId) {
        const task = await this.tasksService.findByIdInOrganization(id, tenantId);
        if (!task)
            return null;
        return this.toResponse(task);
    }
    async updateAssignee(id, tenantId, currentUserId, body) {
        const task = await this.tasksService.update(id, tenantId, { assigneeId: body.assigneeId ?? null }, currentUserId);
        if (!task)
            return null;
        if (body.assigneeId) {
            this.notifyAssignees([body.assigneeId], currentUserId, task.title, task.id, task.projectId).catch((err) => this.logger.warn(`Failed to send assignment notifications: ${err}`));
        }
        return this.toResponse(task);
    }
    async update(id, tenantId, userId, dto) {
        const task = await this.tasksService.update(id, tenantId, dto, userId);
        if (!task)
            return null;
        return this.toResponse(task);
    }
    async notifyCommentObservers(task, commenterUserId, mentionedUserIds = []) {
        const [commenter, project] = await Promise.all([
            this.usersService.findById(commenterUserId),
            this.projectsService.findById(task.projectId),
        ]);
        const commenterName = commenter?.fullName || commenter?.email || 'Someone';
        const projectName = project?.name;
        const assigneeIds = task.assigneeIds ?? (task.assigneeId ? [task.assigneeId] : []);
        const toNotify = new Set([
            ...assigneeIds,
            task.reporterId,
            ...mentionedUserIds,
        ].filter(Boolean));
        toNotify.delete(commenterUserId);
        for (const targetId of toNotify) {
            const isMention = mentionedUserIds.includes(targetId);
            const title = isMention
                ? `${commenterName} mentioned you in "${task.title}"`
                : `New comment on "${task.title}"`;
            const message = isMention
                ? `${commenterName} mentioned you in "${task.title}"${projectName ? ` in ${projectName}` : ''}.`
                : `${commenterName} commented on "${task.title}"${projectName ? ` in ${projectName}` : ''}.`;
            await this.notificationsService.createNotification(targetId, title, message);
        }
    }
    async notifyAssignees(assigneeIds, assignerUserId, taskTitle, taskId, projectId) {
        const [assigner, project] = await Promise.all([
            this.usersService.findById(assignerUserId),
            this.projectsService.findById(projectId),
        ]);
        const assignerName = assigner?.fullName || assigner?.email || 'Someone';
        const projectName = project?.name;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
        const taskUrl = `${frontendUrl}/dashboard/projects/${projectId}/board?task=${taskId}`;
        for (const assigneeId of assigneeIds) {
            if (assigneeId === assignerUserId)
                continue;
            const assignee = await this.usersService.findById(assigneeId);
            if (!assignee?.email)
                continue;
            const assigneeName = assignee.fullName || assignee.email;
            await this.notificationsService.createNotification(assigneeId, `Task assigned: ${taskTitle}`, `${assignerName} assigned you to "${taskTitle}"${projectName ? ` in ${projectName}` : ''}.`).catch((err) => this.logger.warn(`In-app notification failed: ${err}`));
            await this.emailService.sendTaskAssignment({
                to: assignee.email,
                assigneeName,
                taskTitle,
                projectName,
                assignerName,
                taskUrl,
            }).catch((err) => this.logger.warn(`Task assignment email failed for ${assignee.email}: ${err}`));
        }
    }
    toCommentResponse(c) {
        return {
            id: c.id,
            taskId: c.taskId,
            userId: c.userId,
            body: c.comment,
            createdAt: c.createdAt,
            updatedAt: c.createdAt,
            user: c.user
                ? {
                    id: c.user.id,
                    fullName: c.user.fullName,
                    email: c.user.email,
                    avatarUrl: c.user.avatarUrl ?? undefined,
                }
                : undefined,
        };
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
            tags: t.tags ?? undefined,
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
    (0, common_1.Get)('attachments/:attachmentId/file'),
    __param(0, (0, common_1.Param)('attachmentId')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "getAttachmentFile", null);
__decorate([
    (0, common_1.Get)(':id/attachments'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "getAttachments", null);
__decorate([
    (0, common_1.Post)(':id/attachments'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 10 * 1024 * 1024 } })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, current_user_decorator_1.CurrentUserId)()),
    __param(3, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "uploadAttachment", null);
__decorate([
    (0, common_1.Delete)(':id/attachments/:attachmentId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('attachmentId')),
    __param(2, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "deleteAttachment", null);
__decorate([
    (0, common_1.Get)(':id/comments'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "getComments", null);
__decorate([
    (0, common_1.Post)(':id/comments'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, current_user_decorator_1.CurrentUserId)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, create_task_comment_dto_1.CreateTaskCommentDto]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "addComment", null);
__decorate([
    (0, common_1.Delete)(':id/comments/:commentId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('commentId')),
    __param(2, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "deleteComment", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/assignee'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, current_user_decorator_1.CurrentUserId)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "updateAssignee", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, current_user_decorator_1.CurrentUserId)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, patch_task_dto_1.PatchTaskDto]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "update", null);
exports.TasksController = TasksController = TasksController_1 = __decorate([
    (0, common_1.Controller)('tasks'),
    (0, throttler_1.SkipThrottle)({ auth: true }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [tasks_service_1.TasksService,
        email_service_1.EmailService,
        users_service_1.UsersService,
        projects_service_1.ProjectsService,
        notifications_service_1.NotificationsService])
], TasksController);
//# sourceMappingURL=tasks.controller.js.map