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
exports.PlanEntity = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../../common/base.entity");
let PlanEntity = class PlanEntity {
};
exports.PlanEntity = PlanEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer }),
    __metadata("design:type", String)
], PlanEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, unique: true }),
    __metadata("design:type", String)
], PlanEntity.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], PlanEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'price_monthly', type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], PlanEntity.prototype, "priceMonthly", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'price_yearly', type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], PlanEntity.prototype, "priceYearly", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, default: 'INR' }),
    __metadata("design:type", String)
], PlanEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'billing_cycle', type: 'varchar', length: 50, default: 'monthly' }),
    __metadata("design:type", String)
], PlanEntity.prototype, "billingCycle", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_users', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], PlanEntity.prototype, "maxUsers", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_projects', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], PlanEntity.prototype, "maxProjects", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'storage_limit_gb', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], PlanEntity.prototype, "storageLimitGb", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'automation_limit', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], PlanEntity.prototype, "automationLimit", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'integration_limit', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], PlanEntity.prototype, "integrationLimit", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_api_keys', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], PlanEntity.prototype, "maxApiKeys", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'api_enabled', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PlanEntity.prototype, "apiEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sso_enabled', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PlanEntity.prototype, "ssoEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'audit_logs_enabled', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PlanEntity.prototype, "auditLogsEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'custom_workflows', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PlanEntity.prototype, "customWorkflows", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'advanced_reporting', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PlanEntity.prototype, "advancedReporting", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'time_tracking', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PlanEntity.prototype, "timeTracking", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'priority_support', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PlanEntity.prototype, "prioritySupport", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sla_uptime', type: 'varchar', length: 10, nullable: true }),
    __metadata("design:type", Object)
], PlanEntity.prototype, "slaUptime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PlanEntity.prototype, "features", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], PlanEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'display_order', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PlanEntity.prototype, "displayOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_popular', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PlanEntity.prototype, "isPopular", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], PlanEntity.prototype, "createdAt", void 0);
exports.PlanEntity = PlanEntity = __decorate([
    (0, typeorm_1.Entity)('plans')
], PlanEntity);
//# sourceMappingURL=plan.entity.js.map