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
exports.BillingController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const billing_service_1 = require("./billing.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const tenant_guard_1 = require("../auth/guards/tenant.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
let BillingController = class BillingController {
    constructor(billingService) {
        this.billingService = billingService;
    }
    async getPlans() {
        const plans = await this.billingService.getPlans();
        return plans.map((p) => ({
            id: p.id,
            name: p.name,
            pricePerUser: p.pricePerUser,
            billingCycle: p.billingCycle,
            maxProjects: p.maxProjects ?? undefined,
            maxMembers: p.maxMembers ?? undefined,
            features: p.features ?? undefined,
        }));
    }
    async getSubscription(tenantId) {
        const sub = await this.billingService.getSubscriptionForOrganization(tenantId);
        if (!sub)
            return null;
        return {
            id: sub.id,
            organizationId: sub.organizationId,
            planId: sub.planId,
            status: sub.status,
            startDate: sub.startDate ?? undefined,
            endDate: sub.endDate ?? undefined,
            trialEndsAt: sub.trialEndsAt ?? undefined,
        };
    }
    async getInvoices(tenantId) {
        const sub = await this.billingService.getSubscriptionForOrganization(tenantId);
        if (!sub)
            return [];
        const invoices = await this.billingService.getInvoicesForSubscription(sub.id);
        return invoices.map((i) => ({
            id: i.id,
            subscriptionId: i.subscriptionId,
            amount: i.amount,
            status: i.status,
            issuedAt: i.issuedAt,
            paidAt: i.paidAt ?? undefined,
        }));
    }
};
exports.BillingController = BillingController;
__decorate([
    (0, common_1.Get)('plans'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getPlans", null);
__decorate([
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard),
    (0, common_1.Get)('subscription'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getSubscription", null);
__decorate([
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard),
    (0, common_1.Get)('invoices'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getInvoices", null);
exports.BillingController = BillingController = __decorate([
    (0, common_1.Controller)('billing'),
    (0, throttler_1.SkipThrottle)({ auth: true }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [billing_service_1.BillingService])
], BillingController);
//# sourceMappingURL=billing.controller.js.map