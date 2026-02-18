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
exports.CustomFieldsController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const custom_fields_service_1 = require("./custom-fields.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const tenant_guard_1 = require("../auth/guards/tenant.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
const create_custom_field_dto_1 = require("./dto/create-custom-field.dto");
let CustomFieldsController = class CustomFieldsController {
    constructor(customFieldsService) {
        this.customFieldsService = customFieldsService;
    }
    async create(dto) {
        const projectId = dto.projectId;
        const field = await this.customFieldsService.create(projectId, dto);
        return { id: field.id, projectId: field.projectId, name: field.name, fieldType: field.fieldType, isRequired: field.isRequired };
    }
    async findByProject(projectId, tenantId) {
        const list = await this.customFieldsService.findByProject(projectId, tenantId);
        return list.map((f) => ({ id: f.id, projectId: f.projectId, name: f.name, fieldType: f.fieldType, isRequired: f.isRequired }));
    }
};
exports.CustomFieldsController = CustomFieldsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_custom_field_dto_1.CreateCustomFieldDto]),
    __metadata("design:returntype", Promise)
], CustomFieldsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('project/:projectId'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CustomFieldsController.prototype, "findByProject", null);
exports.CustomFieldsController = CustomFieldsController = __decorate([
    (0, common_1.Controller)('custom-fields'),
    (0, throttler_1.SkipThrottle)({ auth: true }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [custom_fields_service_1.CustomFieldsService])
], CustomFieldsController);
//# sourceMappingURL=custom-fields.controller.js.map