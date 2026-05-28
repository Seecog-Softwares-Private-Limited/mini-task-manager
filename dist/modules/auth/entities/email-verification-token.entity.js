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
exports.EmailVerificationTokenEntity = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../../common/base.entity");
const user_entity_1 = require("../../users/entities/user.entity");
let EmailVerificationTokenEntity = class EmailVerificationTokenEntity {
};
exports.EmailVerificationTokenEntity = EmailVerificationTokenEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer }),
    __metadata("design:type", String)
], EmailVerificationTokenEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer }),
    __metadata("design:type", String)
], EmailVerificationTokenEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 64 }),
    __metadata("design:type", String)
], EmailVerificationTokenEntity.prototype, "token", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'short_code', type: 'varchar', length: 6, nullable: true }),
    __metadata("design:type", Object)
], EmailVerificationTokenEntity.prototype, "shortCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', type: 'timestamp' }),
    __metadata("design:type", Date)
], EmailVerificationTokenEntity.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], EmailVerificationTokenEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.UserEntity)
], EmailVerificationTokenEntity.prototype, "user", void 0);
exports.EmailVerificationTokenEntity = EmailVerificationTokenEntity = __decorate([
    (0, typeorm_1.Entity)('email_verification_tokens')
], EmailVerificationTokenEntity);
//# sourceMappingURL=email-verification-token.entity.js.map