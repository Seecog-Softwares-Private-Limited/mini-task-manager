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
exports.TaskCustomFieldValueEntity = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../../common/base.entity");
const task_entity_1 = require("../../tasks/entities/task.entity");
const custom_field_entity_1 = require("./custom-field.entity");
let TaskCustomFieldValueEntity = class TaskCustomFieldValueEntity {
};
exports.TaskCustomFieldValueEntity = TaskCustomFieldValueEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer }),
    __metadata("design:type", String)
], TaskCustomFieldValueEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'task_id', type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer }),
    __metadata("design:type", String)
], TaskCustomFieldValueEntity.prototype, "taskId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'custom_field_id', type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer }),
    __metadata("design:type", String)
], TaskCustomFieldValueEntity.prototype, "customFieldId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], TaskCustomFieldValueEntity.prototype, "value", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => task_entity_1.TaskEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'task_id' }),
    __metadata("design:type", task_entity_1.TaskEntity)
], TaskCustomFieldValueEntity.prototype, "task", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => custom_field_entity_1.CustomFieldEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'custom_field_id' }),
    __metadata("design:type", custom_field_entity_1.CustomFieldEntity)
], TaskCustomFieldValueEntity.prototype, "customField", void 0);
exports.TaskCustomFieldValueEntity = TaskCustomFieldValueEntity = __decorate([
    (0, typeorm_1.Entity)('task_custom_field_values')
], TaskCustomFieldValueEntity);
//# sourceMappingURL=task-custom-field-value.entity.js.map