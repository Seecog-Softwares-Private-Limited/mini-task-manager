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
exports.WorkflowStatusEntity = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../../common/base.entity");
const workflow_entity_1 = require("./workflow.entity");
let WorkflowStatusEntity = class WorkflowStatusEntity {
};
exports.WorkflowStatusEntity = WorkflowStatusEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer }),
    __metadata("design:type", String)
], WorkflowStatusEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'workflow_id',
        type: 'char',
        length: 36,
    }),
    __metadata("design:type", String)
], WorkflowStatusEntity.prototype, "workflowId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], WorkflowStatusEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], WorkflowStatusEntity.prototype, "position", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], WorkflowStatusEntity.prototype, "color", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], WorkflowStatusEntity.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => workflow_entity_1.WorkflowEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'workflow_id' }),
    __metadata("design:type", workflow_entity_1.WorkflowEntity)
], WorkflowStatusEntity.prototype, "workflow", void 0);
exports.WorkflowStatusEntity = WorkflowStatusEntity = __decorate([
    (0, typeorm_1.Entity)('workflow_statuses')
], WorkflowStatusEntity);
//# sourceMappingURL=workflow-status.entity.js.map