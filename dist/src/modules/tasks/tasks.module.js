"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("../auth/auth.module");
const organizations_module_1 = require("../organizations/organizations.module");
const projects_module_1 = require("../projects/projects.module");
const task_entity_1 = require("./entities/task.entity");
const task_comment_entity_1 = require("./entities/task-comment.entity");
const task_attachment_entity_1 = require("./entities/task-attachment.entity");
const tasks_repository_1 = require("./repositories/tasks.repository");
const task_comments_repository_1 = require("./repositories/task-comments.repository");
const task_attachments_repository_1 = require("./repositories/task-attachments.repository");
const tasks_service_1 = require("./tasks.service");
const tasks_controller_1 = require("./tasks.controller");
let TasksModule = class TasksModule {
};
exports.TasksModule = TasksModule;
exports.TasksModule = TasksModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([task_entity_1.TaskEntity, task_comment_entity_1.TaskCommentEntity, task_attachment_entity_1.TaskAttachmentEntity]),
            auth_module_1.AuthModule,
            organizations_module_1.OrganizationsModule,
            projects_module_1.ProjectsModule,
        ],
        controllers: [tasks_controller_1.TasksController],
        providers: [tasks_repository_1.TasksRepository, task_comments_repository_1.TaskCommentsRepository, task_attachments_repository_1.TaskAttachmentsRepository, tasks_service_1.TasksService],
        exports: [tasks_service_1.TasksService, tasks_repository_1.TasksRepository],
    })
], TasksModule);
//# sourceMappingURL=tasks.module.js.map