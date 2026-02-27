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
exports.OrganizationUsageEntity = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../../common/base.entity");
let OrganizationUsageEntity = class OrganizationUsageEntity {
};
exports.OrganizationUsageEntity = OrganizationUsageEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'organization_id', type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer }),
    __metadata("design:type", String)
], OrganizationUsageEntity.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'users_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], OrganizationUsageEntity.prototype, "usersCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'projects_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], OrganizationUsageEntity.prototype, "projectsCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'storage_used_mb', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], OrganizationUsageEntity.prototype, "storageUsedMb", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'automation_used', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], OrganizationUsageEntity.prototype, "automationUsed", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'integrations_used', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], OrganizationUsageEntity.prototype, "integrationsUsed", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], OrganizationUsageEntity.prototype, "updatedAt", void 0);
exports.OrganizationUsageEntity = OrganizationUsageEntity = __decorate([
    (0, typeorm_1.Entity)('organization_usage')
], OrganizationUsageEntity);
//# sourceMappingURL=organization-usage.entity.js.map