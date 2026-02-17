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
exports.TaskEntity = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../../common/base.entity");
const base_entity_2 = require("../../../common/base.entity");
const project_entity_1 = require("../../projects/entities/project.entity");
const user_entity_1 = require("../../users/entities/user.entity");
const workflow_status_entity_1 = require("../../workflows/entities/workflow-status.entity");
const sprint_entity_1 = require("../../sprints/entities/sprint.entity");
let TaskEntity = class TaskEntity extends base_entity_2.BaseEntity {
};
exports.TaskEntity = TaskEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer }),
    __metadata("design:type", String)
], TaskEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id', type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer }),
    __metadata("design:type", String)
], TaskEntity.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'organization_id', type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer }),
    __metadata("design:type", String)
], TaskEntity.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 300 }),
    __metadata("design:type", String)
], TaskEntity.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], TaskEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status_id', type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer, nullable: true }),
    __metadata("design:type", Object)
], TaskEntity.prototype, "statusId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'MEDIUM' }),
    __metadata("design:type", String)
], TaskEntity.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'assignee_id', type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer, nullable: true }),
    __metadata("design:type", Object)
], TaskEntity.prototype, "assigneeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reporter_id', type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer }),
    __metadata("design:type", String)
], TaskEntity.prototype, "reporterId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'parent_task_id', type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer, nullable: true }),
    __metadata("design:type", Object)
], TaskEntity.prototype, "parentTaskId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'story_points', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], TaskEntity.prototype, "storyPoints", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'due_date', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], TaskEntity.prototype, "dueDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'estimated_minutes', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], TaskEntity.prototype, "estimatedMinutes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'logged_minutes', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], TaskEntity.prototype, "loggedMinutes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sprint_id', type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer, nullable: true }),
    __metadata("design:type", Object)
], TaskEntity.prototype, "sprintId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.ProjectEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'project_id' }),
    __metadata("design:type", project_entity_1.ProjectEntity)
], TaskEntity.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => workflow_status_entity_1.WorkflowStatusEntity, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'status_id' }),
    __metadata("design:type", workflow_status_entity_1.WorkflowStatusEntity)
], TaskEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'assignee_id' }),
    __metadata("design:type", user_entity_1.UserEntity)
], TaskEntity.prototype, "assignee", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'reporter_id' }),
    __metadata("design:type", user_entity_1.UserEntity)
], TaskEntity.prototype, "reporter", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TaskEntity, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'parent_task_id' }),
    __metadata("design:type", TaskEntity)
], TaskEntity.prototype, "parentTask", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => sprint_entity_1.SprintEntity, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'sprint_id' }),
    __metadata("design:type", sprint_entity_1.SprintEntity)
], TaskEntity.prototype, "sprint", void 0);
exports.TaskEntity = TaskEntity = __decorate([
    (0, typeorm_1.Entity)('tasks')
], TaskEntity);
//# sourceMappingURL=task.entity.js.map