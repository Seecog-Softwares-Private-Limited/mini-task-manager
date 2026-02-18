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
exports.TaskAttachmentEntity = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../../common/base.entity");
const task_entity_1 = require("./task.entity");
const user_entity_1 = require("../../users/entities/user.entity");
let TaskAttachmentEntity = class TaskAttachmentEntity {
};
exports.TaskAttachmentEntity = TaskAttachmentEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer }),
    __metadata("design:type", String)
], TaskAttachmentEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'task_id', type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer }),
    __metadata("design:type", String)
], TaskAttachmentEntity.prototype, "taskId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_url', type: 'text' }),
    __metadata("design:type", String)
], TaskAttachmentEntity.prototype, "fileUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_name', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], TaskAttachmentEntity.prototype, "fileName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'uploaded_by', type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer }),
    __metadata("design:type", String)
], TaskAttachmentEntity.prototype, "uploadedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'uploaded_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], TaskAttachmentEntity.prototype, "uploadedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => task_entity_1.TaskEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'task_id' }),
    __metadata("design:type", task_entity_1.TaskEntity)
], TaskAttachmentEntity.prototype, "task", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'uploaded_by' }),
    __metadata("design:type", user_entity_1.UserEntity)
], TaskAttachmentEntity.prototype, "uploader", void 0);
exports.TaskAttachmentEntity = TaskAttachmentEntity = __decorate([
    (0, typeorm_1.Entity)('task_attachments')
], TaskAttachmentEntity);
//# sourceMappingURL=task-attachment.entity.js.map