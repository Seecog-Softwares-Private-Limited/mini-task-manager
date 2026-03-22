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
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const tasks_repository_1 = require("./repositories/tasks.repository");
const task_comments_repository_1 = require("./repositories/task-comments.repository");
const task_attachments_repository_1 = require("./repositories/task-attachments.repository");
const projects_service_1 = require("../projects/projects.service");
const usage_service_1 = require("../billing/usage.service");
const activity_logs_service_1 = require("../activity-logs/activity-logs.service");
const pagination_1 = require("../../common/pagination");
const uuid_util_1 = require("../../common/utils/uuid.util");
const fs = require("fs/promises");
const path = require("path");
const MAX_FILE_SIZE = 10 * 1024 * 1024;
function isAllowedMime(mimetype) {
    if (!mimetype)
        return false;
    return (mimetype.startsWith('image/') ||
        mimetype.startsWith('text/') ||
        mimetype === 'application/pdf' ||
        mimetype === 'application/json' ||
        mimetype.startsWith('application/zip') ||
        mimetype === 'application/x-zip-compressed');
}
function sanitizeFileName(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'file';
}
let TasksService = class TasksService {
    constructor(tasksRepository, taskCommentsRepository, taskAttachmentsRepository, projectsService, usageService, activityLogsService, configService) {
        this.tasksRepository = tasksRepository;
        this.taskCommentsRepository = taskCommentsRepository;
        this.taskAttachmentsRepository = taskAttachmentsRepository;
        this.projectsService = projectsService;
        this.usageService = usageService;
        this.activityLogsService = activityLogsService;
        this.configService = configService;
    }
    async findById(id) {
        return this.tasksRepository.findById(id);
    }
    async findByIdInOrganization(id, organizationId) {
        return this.tasksRepository.findByIdAndOrganization(id, organizationId);
    }
    async findByProject(projectId, organizationId, query) {
        const project = await this.projectsService.findByIdInOrganization(projectId, organizationId);
        if (!project) {
            return (0, pagination_1.paginate)([], 0, query?.page ?? 1, query?.limit ?? 20);
        }
        const [data, total] = await this.tasksRepository.findByProject(projectId, query?.page ?? 1, query?.limit ?? 20);
        return (0, pagination_1.paginate)(data, total, query?.page ?? 1, query?.limit ?? 20);
    }
    async create(projectId, organizationId, reporterId, dto) {
        const assigneeIds = dto.assigneeIds?.length
            ? Array.from(new Set(dto.assigneeIds))
            : dto.assigneeId
                ? [dto.assigneeId]
                : [];
        const normalizedSubtasks = this.normalizeSubtasks(dto.subtasks);
        const tags = this.normalizeTags(dto.tags);
        const task = await this.tasksRepository.create({
            projectId,
            organizationId,
            reporterId,
            title: dto.title,
            description: dto.description ?? null,
            statusId: null,
            priority: dto.priority ?? 'MEDIUM',
            assigneeId: assigneeIds[0] ?? dto.assigneeId ?? null,
            assigneeIds: assigneeIds.length ? assigneeIds : null,
            subtasks: normalizedSubtasks.length ? normalizedSubtasks : null,
            parentTaskId: dto.parentTaskId ?? null,
            sprintId: dto.sprintId ?? null,
            tags: tags.length ? tags : null,
        });
        this.activityLogsService
            .log({ organizationId, userId: reporterId, entityType: 'task', entityId: task.id, action: 'create', metadata: { name: task.title } })
            .catch(() => { });
        return task;
    }
    async update(taskId, organizationId, dto, userId) {
        const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
        if (!task)
            return null;
        const patch = {};
        if (dto.title !== undefined) {
            const trimmedTitle = dto.title.trim();
            if (trimmedTitle.length > 0) {
                patch.title = trimmedTitle;
            }
        }
        if (dto.description !== undefined) {
            const trimmedDescription = dto.description.trim();
            patch.description = trimmedDescription.length > 0 ? trimmedDescription : null;
        }
        if (dto.statusId !== undefined)
            patch.statusId = dto.statusId ?? null;
        if (dto.sprintId !== undefined)
            patch.sprintId = dto.sprintId ?? null;
        if (dto.assigneeId !== undefined) {
            patch.assigneeId = dto.assigneeId ?? null;
            patch.assigneeIds = patch.assigneeId ? [patch.assigneeId] : null;
        }
        if (dto.dueDate !== undefined) {
            if (dto.dueDate === null || dto.dueDate === '') {
                patch.dueDate = null;
            }
            else {
                const ymd = String(dto.dueDate).slice(0, 10);
                patch.dueDate = ymd;
            }
        }
        if (dto.priority !== undefined) {
            patch.priority = dto.priority;
        }
        if (dto.storyPoints !== undefined)
            patch.storyPoints = dto.storyPoints ?? null;
        if (dto.tags !== undefined) {
            const normalized = this.normalizeTags(dto.tags);
            patch.tags = normalized.length ? normalized : null;
        }
        if (dto.subtasks !== undefined) {
            const normalized = this.normalizeSubtasks(dto.subtasks);
            patch.subtasks = normalized.length ? normalized : null;
        }
        if (Object.keys(patch).length > 0) {
            await this.tasksRepository.update(taskId, patch);
            const action = dto.statusId !== undefined ? 'move' : 'update';
            this.activityLogsService
                .log({ organizationId, userId: userId ?? undefined, entityType: 'task', entityId: taskId, action, metadata: { name: task.title } })
                .catch(() => { });
        }
        return this.tasksRepository.findById(taskId);
    }
    normalizeTags(tags) {
        if (!tags?.length)
            return [];
        const seen = new Set();
        return tags
            .filter((t) => t?.name != null && String(t.name).trim().length > 0)
            .map((t) => ({
            name: String(t.name).trim().slice(0, 80),
            color: String(t.color ?? '#6B7280').trim().slice(0, 20),
        }))
            .filter((t) => {
            const key = t.name.toLowerCase();
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
    normalizeSubtasks(subtasks) {
        if (!subtasks?.length)
            return [];
        return subtasks
            .map((s) => ({
            id: s.id ?? (0, uuid_util_1.generateUuid)(),
            title: s.title?.trim() ?? '',
            completed: Boolean(s.completed),
            assigneeId: s.assigneeId || undefined,
            dueDate: s.dueDate || undefined,
            priority: s.priority ?? 'MEDIUM',
        }))
            .filter((s) => s.title.length > 0);
    }
    async getComments(taskId) {
        return this.taskCommentsRepository.findByTask(taskId);
    }
    async addComment(taskId, organizationId, userId, body) {
        const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        const trimmed = body.trim();
        if (!trimmed.length)
            throw new common_1.BadRequestException('Comment cannot be empty');
        const comment = await this.taskCommentsRepository.create({
            taskId,
            userId,
            comment: trimmed,
        });
        return this.taskCommentsRepository.findById(comment.id);
    }
    async deleteComment(taskId, commentId, organizationId) {
        const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        const comment = await this.taskCommentsRepository.findById(commentId);
        if (!comment || comment.taskId !== taskId)
            throw new common_1.NotFoundException('Comment not found');
        await this.taskCommentsRepository.delete(commentId);
    }
    async getAttachments(taskId) {
        return this.taskAttachmentsRepository.findByTask(taskId);
    }
    async addAttachment(taskId, organizationId, userId, file) {
        const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        if (file.size > MAX_FILE_SIZE)
            throw new common_1.ForbiddenException('File too large (max 10MB)');
        if (!isAllowedMime(file.mimetype || ''))
            throw new common_1.ForbiddenException('File type not allowed');
        const storageMbIncrement = Math.ceil(file.size / (1024 * 1024));
        const limitCheck = await this.usageService.checkLimit(organizationId, 'storageGb', storageMbIncrement);
        if (!limitCheck.allowed) {
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.FORBIDDEN,
                error: 'LIMIT_EXCEEDED',
                code: 'SUBSCRIPTION_LIMIT_EXCEEDED',
                resource: limitCheck.resource,
                current: limitCheck.current,
                limit: limitCheck.limit,
                message: limitCheck.message,
                upgradeUrl: '/dashboard/billing',
            }, common_1.HttpStatus.FORBIDDEN);
        }
        const uploadsPath = this.configService.get('uploadsPath', { infer: true });
        const dir = path.join(uploadsPath, 'task-attachments', taskId);
        await fs.mkdir(dir, { recursive: true });
        const ext = path.extname(file.originalname || '') || '';
        const base = sanitizeFileName(path.basename(file.originalname || 'file', ext));
        const relativePath = path.join('task-attachments', taskId, `${(0, uuid_util_1.generateUuid)()}-${base}${ext}`);
        const fullPath = path.join(uploadsPath, relativePath);
        await fs.writeFile(fullPath, file.buffer);
        const attachment = await this.taskAttachmentsRepository.create({
            taskId,
            fileUrl: relativePath.replace(/\\/g, '/'),
            fileName: file.originalname || null,
            fileSizeBytes: file.size,
            uploadedBy: userId,
        });
        return attachment;
    }
    async getAttachmentFile(attachmentId, organizationId) {
        const attachment = await this.taskAttachmentsRepository.findById(attachmentId);
        if (!attachment)
            throw new common_1.NotFoundException('Attachment not found');
        const task = await this.tasksRepository.findByIdAndOrganization(attachment.taskId, organizationId);
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        const uploadsPath = this.configService.get('uploadsPath', { infer: true });
        const fullPath = path.join(uploadsPath, attachment.fileUrl);
        return { path: fullPath, fileName: attachment.fileName };
    }
    async deleteAttachment(taskId, attachmentId, organizationId) {
        const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        const attachment = await this.taskAttachmentsRepository.findById(attachmentId);
        if (!attachment || attachment.taskId !== taskId)
            throw new common_1.NotFoundException('Attachment not found');
        const uploadsPath = this.configService.get('uploadsPath', { infer: true });
        const fullPath = path.join(uploadsPath, attachment.fileUrl);
        await fs.unlink(fullPath).catch(() => { });
        await this.taskAttachmentsRepository.delete(attachmentId);
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tasks_repository_1.TasksRepository,
        task_comments_repository_1.TaskCommentsRepository,
        task_attachments_repository_1.TaskAttachmentsRepository,
        projects_service_1.ProjectsService,
        usage_service_1.UsageService,
        activity_logs_service_1.ActivityLogsService,
        config_1.ConfigService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map