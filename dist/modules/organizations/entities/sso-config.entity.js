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
exports.SSOConfigEntity = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../../common/base.entity");
const organization_entity_1 = require("./organization.entity");
let SSOConfigEntity = class SSOConfigEntity {
};
exports.SSOConfigEntity = SSOConfigEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer }),
    __metadata("design:type", String)
], SSOConfigEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'organization_id', type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer }),
    __metadata("design:type", String)
], SSOConfigEntity.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], SSOConfigEntity.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 150, nullable: true }),
    __metadata("design:type", Object)
], SSOConfigEntity.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'issuer_url', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], SSOConfigEntity.prototype, "issuerUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sso_url', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], SSOConfigEntity.prototype, "ssoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'client_id', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], SSOConfigEntity.prototype, "clientId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'client_secret', type: 'varchar', length: 512, nullable: true }),
    __metadata("design:type", Object)
], SSOConfigEntity.prototype, "clientSecret", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], SSOConfigEntity.prototype, "certificate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'metadata_url', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], SSOConfigEntity.prototype, "metadataUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], SSOConfigEntity.prototype, "domains", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_enabled', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], SSOConfigEntity.prototype, "isEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], SSOConfigEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], SSOConfigEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organization_entity_1.OrganizationEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'organization_id' }),
    __metadata("design:type", organization_entity_1.OrganizationEntity)
], SSOConfigEntity.prototype, "organization", void 0);
exports.SSOConfigEntity = SSOConfigEntity = __decorate([
    (0, typeorm_1.Entity)('sso_configs'),
    (0, typeorm_1.Index)('idx_sso_configs_organization_id', ['organizationId'], { unique: true })
], SSOConfigEntity);
//# sourceMappingURL=sso-config.entity.js.map