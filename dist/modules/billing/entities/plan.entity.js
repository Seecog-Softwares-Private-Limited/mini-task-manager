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
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], PlanEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'price_per_user', type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], PlanEntity.prototype, "pricePerUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'billing_cycle', type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], PlanEntity.prototype, "billingCycle", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_projects', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], PlanEntity.prototype, "maxProjects", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_members', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], PlanEntity.prototype, "maxMembers", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PlanEntity.prototype, "features", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], PlanEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], PlanEntity.prototype, "createdAt", void 0);
exports.PlanEntity = PlanEntity = __decorate([
    (0, typeorm_1.Entity)('plans')
], PlanEntity);
//# sourceMappingURL=plan.entity.js.map