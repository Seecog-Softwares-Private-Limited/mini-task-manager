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
exports.PatchTaskDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const emptyStrToUndef = ({ value }) => value === '' ? undefined : value;
const emptyStrToNull = ({ value }) => value === '' ? null : value;
const patchTaskDueDate = ({ value }) => {
    if (value === '' || value === null || value === undefined) {
        return value === '' ? null : value;
    }
    if (typeof value === 'string') {
        const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
        if (m)
            return m[1];
    }
    return value;
};
const patchSubtaskDueDate = ({ value }) => {
    if (value === '' || value === null || value === undefined)
        return undefined;
    if (typeof value === 'string') {
        const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
        if (m)
            return m[1];
    }
    return value;
};
class PatchTaskSubtaskDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PatchTaskSubtaskDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], PatchTaskSubtaskDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PatchTaskSubtaskDto.prototype, "completed", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(emptyStrToUndef),
    (0, class_validator_1.ValidateIf)((_o, v) => v != null && v !== ''),
    (0, class_validator_1.IsUUID)('4'),
    __metadata("design:type", String)
], PatchTaskSubtaskDto.prototype, "assigneeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(patchSubtaskDueDate),
    (0, class_validator_1.ValidateIf)((_o, v) => v != null && v !== ''),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}$/, { message: 'subtask dueDate must be YYYY-MM-DD' }),
    __metadata("design:type", String)
], PatchTaskSubtaskDto.prototype, "dueDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value)),
    (0, class_validator_1.IsIn)(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    __metadata("design:type", String)
], PatchTaskSubtaskDto.prototype, "priority", void 0);
class PatchTaskTagDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], PatchTaskTagDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], PatchTaskTagDto.prototype, "color", void 0);
class PatchTaskDto {
}
exports.PatchTaskDto = PatchTaskDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], PatchTaskDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PatchTaskDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(emptyStrToNull),
    (0, class_validator_1.ValidateIf)((_o, v) => v != null),
    (0, class_validator_1.IsUUID)('4', { message: 'statusId must be a valid UUID' }),
    __metadata("design:type", Object)
], PatchTaskDto.prototype, "statusId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(emptyStrToNull),
    (0, class_validator_1.ValidateIf)((_o, v) => v != null),
    (0, class_validator_1.IsUUID)('4', { message: 'sprintId must be a valid UUID' }),
    __metadata("design:type", Object)
], PatchTaskDto.prototype, "sprintId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(emptyStrToNull),
    (0, class_validator_1.ValidateIf)((_o, v) => v != null),
    (0, class_validator_1.IsUUID)('4', { message: 'assigneeId must be a valid UUID' }),
    __metadata("design:type", Object)
], PatchTaskDto.prototype, "assigneeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(patchTaskDueDate),
    (0, class_validator_1.ValidateIf)((_o, v) => v !== null && v !== undefined && v !== ''),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}$/, { message: 'dueDate must be YYYY-MM-DD' }),
    __metadata("design:type", Object)
], PatchTaskDto.prototype, "dueDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value)),
    (0, class_validator_1.IsIn)(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    __metadata("design:type", String)
], PatchTaskDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_o, v) => v != null),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Object)
], PatchTaskDto.prototype, "storyPoints", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PatchTaskTagDto),
    __metadata("design:type", Array)
], PatchTaskDto.prototype, "tags", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PatchTaskSubtaskDto),
    __metadata("design:type", Array)
], PatchTaskDto.prototype, "subtasks", void 0);
//# sourceMappingURL=patch-task.dto.js.map