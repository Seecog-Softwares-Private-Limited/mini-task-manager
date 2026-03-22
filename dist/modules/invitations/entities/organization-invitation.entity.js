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
exports.OrganizationInvitationEntity = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../../common/base.entity");
const organization_entity_1 = require("../../organizations/entities/organization.entity");
const user_entity_1 = require("../../users/entities/user.entity");
let OrganizationInvitationEntity = class OrganizationInvitationEntity {
};
exports.OrganizationInvitationEntity = OrganizationInvitationEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer }),
    __metadata("design:type", String)
], OrganizationInvitationEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'organization_id', type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer }),
    __metadata("design:type", String)
], OrganizationInvitationEntity.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], OrganizationInvitationEntity.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], OrganizationInvitationEntity.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 64, unique: true }),
    __metadata("design:type", String)
], OrganizationInvitationEntity.prototype, "token", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'invited_by', type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer }),
    __metadata("design:type", String)
], OrganizationInvitationEntity.prototype, "invitedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'PENDING' }),
    __metadata("design:type", String)
], OrganizationInvitationEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', type: 'timestamp' }),
    __metadata("design:type", Date)
], OrganizationInvitationEntity.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], OrganizationInvitationEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organization_entity_1.OrganizationEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'organization_id' }),
    __metadata("design:type", organization_entity_1.OrganizationEntity)
], OrganizationInvitationEntity.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'invited_by' }),
    __metadata("design:type", user_entity_1.UserEntity)
], OrganizationInvitationEntity.prototype, "inviter", void 0);
exports.OrganizationInvitationEntity = OrganizationInvitationEntity = __decorate([
    (0, typeorm_1.Entity)('organization_invitations'),
    (0, typeorm_1.Index)('idx_invitation_token', ['token'], { unique: true }),
    (0, typeorm_1.Index)('idx_invitation_org_email', ['organizationId', 'email'])
], OrganizationInvitationEntity);
//# sourceMappingURL=organization-invitation.entity.js.map