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
exports.InvoiceEntity = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../../common/base.entity");
const subscription_entity_1 = require("./subscription.entity");
let InvoiceEntity = class InvoiceEntity {
};
exports.InvoiceEntity = InvoiceEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer }),
    __metadata("design:type", String)
], InvoiceEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'subscription_id', type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer }),
    __metadata("design:type", String)
], InvoiceEntity.prototype, "subscriptionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'organization_id', type: 'binary', length: 16, transformer: base_entity_1.uuidBinaryTransformer }),
    __metadata("design:type", String)
], InvoiceEntity.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], InvoiceEntity.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, default: 'INR' }),
    __metadata("design:type", String)
], InvoiceEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'UNPAID' }),
    __metadata("design:type", String)
], InvoiceEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'billing_cycle', type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], InvoiceEntity.prototype, "billingCycle", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'plan_name', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], InvoiceEntity.prototype, "planName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_count', type: 'int', default: 1 }),
    __metadata("design:type", Number)
], InvoiceEntity.prototype, "userCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'razorpay_invoice_id', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], InvoiceEntity.prototype, "razorpayInvoiceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'issued_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], InvoiceEntity.prototype, "issuedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'due_date', type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], InvoiceEntity.prototype, "dueDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'paid_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], InvoiceEntity.prototype, "paidAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => subscription_entity_1.SubscriptionEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'subscription_id' }),
    __metadata("design:type", subscription_entity_1.SubscriptionEntity)
], InvoiceEntity.prototype, "subscription", void 0);
exports.InvoiceEntity = InvoiceEntity = __decorate([
    (0, typeorm_1.Entity)('invoices'),
    (0, typeorm_1.Index)('idx_invoices_subscription_id', ['subscriptionId'])
], InvoiceEntity);
//# sourceMappingURL=invoice.entity.js.map