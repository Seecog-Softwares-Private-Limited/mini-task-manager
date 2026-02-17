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
const tasks_repository_1 = require("./repositories/tasks.repository");
const task_comments_repository_1 = require("./repositories/task-comments.repository");
const task_attachments_repository_1 = require("./repositories/task-attachments.repository");
const projects_service_1 = require("../projects/projects.service");
const pagination_1 = require("../../common/pagination");
let TasksService = class TasksService {
    constructor(tasksRepository, taskCommentsRepository, taskAttachmentsRepository, projectsService) {
        this.tasksRepository = tasksRepository;
        this.taskCommentsRepository = taskCommentsRepository;
        this.taskAttachmentsRepository = taskAttachmentsRepository;
        this.projectsService = projectsService;
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
        return this.tasksRepository.create({
            projectId,
            organizationId,
            reporterId,
            title: dto.title,
            description: dto.description ?? null,
            statusId: dto.statusId ?? null,
            priority: dto.priority ?? 'MEDIUM',
            assigneeId: dto.assigneeId ?? null,
            parentTaskId: dto.parentTaskId ?? null,
            sprintId: dto.sprintId ?? null,
        });
    }
    async getComments(taskId) {
        return this.taskCommentsRepository.findByTask(taskId);
    }
    async getAttachments(taskId) {
        return this.taskAttachmentsRepository.findByTask(taskId);
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tasks_repository_1.TasksRepository,
        task_comments_repository_1.TaskCommentsRepository,
        task_attachments_repository_1.TaskAttachmentsRepository,
        projects_service_1.ProjectsService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map