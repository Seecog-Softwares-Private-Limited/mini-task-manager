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
const public_decorator_1 = require("../../common/decorators/public.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const roles_guard_1 = require("../auth/guards/roles.guard");
const billing_service_1 = require("./billing.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const tenant_guard_1 = require("../auth/guards/tenant.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
const billing_request_dto_1 = require("./dto/billing-request.dto");
function toUsageBucket(current, limit) {
    return {
        current,
        limit,
        percentage: limit != null && limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : null,
    };
}
let BillingController = class BillingController {
    constructor(billingService) {
        this.billingService = billingService;
    }
    async getPlans() {
        const plans = await this.billingService.getPlans();
        return plans.map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            priceMonthly: Number(p.priceMonthly),
            priceYearly: Number(p.priceYearly),
            currency: p.currency,
            maxUsers: p.maxUsers,
            maxProjects: p.maxProjects,
            storageLimitGb: p.storageLimitGb,
            automationLimit: p.automationLimit,
            integrationLimit: p.integrationLimit,
            maxApiKeys: p.maxApiKeys ?? null,
            apiEnabled: p.apiEnabled,
            ssoEnabled: p.ssoEnabled,
            auditLogsEnabled: p.auditLogsEnabled,
            customWorkflows: p.customWorkflows,
            advancedReporting: p.advancedReporting,
            timeTracking: p.timeTracking,
            prioritySupport: p.prioritySupport,
            slaUptime: p.slaUptime,
            features: p.features ?? undefined,
            isPopular: p.isPopular,
            displayOrder: p.displayOrder,
        }));
    }
    async getSubscription(tenantId) {
        const sub = await this.billingService.getSubscriptionForOrganization(tenantId);
        if (!sub)
            return null;
        const plan = await this.billingService.getPlanById(sub.planId);
        const now = new Date();
        const isTrialExpired = sub.status === 'TRIAL' && sub.trialEndsAt && new Date(sub.trialEndsAt) <= now;
        let daysRemaining;
        if (sub.endDate) {
            daysRemaining = Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        }
        if (sub.status === 'TRIAL' && sub.trialEndsAt) {
            daysRemaining = Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        }
        return {
            id: sub.id,
            organizationId: sub.organizationId,
            planId: sub.planId,
            planSlug: plan?.slug ?? 'free',
            planName: plan?.name ?? 'Free',
            billingCycle: sub.billingCycle,
            status: isTrialExpired ? 'EXPIRED' : sub.status,
            startDate: sub.startDate ?? undefined,
            endDate: sub.endDate ?? undefined,
            trialEndsAt: sub.trialEndsAt ?? undefined,
            cancelledAt: sub.cancelledAt ?? undefined,
            razorpaySubscriptionId: sub.razorpaySubscriptionId ?? undefined,
            daysRemaining,
            isTrialExpired: isTrialExpired ?? false,
        };
    }
    async getUsage(tenantId) {
        const [usage, sub] = await Promise.all([
            this.billingService.getUsage(tenantId),
            this.billingService.getSubscriptionForOrganization(tenantId),
        ]);
        const plan = sub?.planId ? await this.billingService.getPlanById(sub.planId) : null;
        const isTrial = sub?.status === 'TRIAL';
        const isTrialExpired = isTrial && sub?.trialEndsAt && new Date(sub.trialEndsAt) <= new Date();
        return {
            users: toUsageBucket(usage.users.current, usage.users.limit),
            projects: toUsageBucket(usage.projects.current, usage.projects.limit),
            storageGb: toUsageBucket(usage.storageGb.current, usage.storageGb.limit),
            automations: toUsageBucket(usage.automations.current, usage.automations.limit),
            integrations: toUsageBucket(usage.integrations.current, usage.integrations.limit),
            apiKeys: toUsageBucket(usage.apiKeys.current, usage.apiKeys.limit),
            planName: plan?.name ?? null,
            planSlug: plan?.slug ?? null,
            subscriptionStatus: isTrialExpired ? 'EXPIRED' : (sub?.status ?? null),
            billingCycle: sub?.billingCycle ?? null,
            isTrial: isTrial && !isTrialExpired,
            trialEndsAt: sub?.trialEndsAt ?? null,
            isTrialExpired: isTrialExpired ?? false,
        };
    }
    async getUsageIndicator(tenantId) {
        const [usage, sub] = await Promise.all([
            this.billingService.getUsage(tenantId),
            this.billingService.getSubscriptionForOrganization(tenantId),
        ]);
        const plan = sub?.planId ? await this.billingService.getPlanById(sub.planId) : null;
        const isTrial = sub?.status === 'TRIAL';
        const isTrialExpired = isTrial && sub?.trialEndsAt && new Date(sub.trialEndsAt) <= new Date();
        const anyAtLimit = (usage.users.limit != null && usage.users.current >= usage.users.limit) ||
            (usage.projects.limit != null && usage.projects.current >= usage.projects.limit) ||
            (usage.storageGb.limit != null && usage.storageGb.current >= usage.storageGb.limit);
        return {
            planName: plan?.name ?? null,
            planSlug: plan?.slug ?? null,
            isTrial: isTrial && !isTrialExpired,
            isTrialExpired: isTrialExpired ?? false,
            trialEndsAt: sub?.trialEndsAt ?? null,
            atLimit: anyAtLimit,
            users: { current: usage.users.current, limit: usage.users.limit },
            projects: { current: usage.projects.current, limit: usage.projects.limit },
            storageGb: { current: usage.storageGb.current, limit: usage.storageGb.limit },
        };
    }
    async getFeatureFlags(tenantId) {
        return this.billingService.getFeatureFlags(tenantId);
    }
    async getInvoices(tenantId) {
        const invoices = await this.billingService.getInvoicesForOrganization(tenantId);
        return invoices.map((i) => ({
            id: i.id,
            subscriptionId: i.subscriptionId,
            amount: Number(i.amount),
            currency: i.currency,
            status: i.status,
            billingCycle: i.billingCycle,
            planName: i.planName,
            userCount: i.userCount,
            issuedAt: i.issuedAt,
            dueDate: i.dueDate ?? undefined,
            paidAt: i.paidAt ?? undefined,
        }));
    }
    async startTrial(tenantId, body) {
        const sub = await this.billingService.startTrial(tenantId, body.planId || 'pro');
        const plan = await this.billingService.getPlanById(sub.planId);
        return {
            id: sub.id,
            organizationId: sub.organizationId,
            planId: sub.planId,
            planSlug: plan?.slug ?? 'free',
            planName: plan?.name ?? 'Free',
            billingCycle: sub.billingCycle,
            status: sub.status,
            startDate: sub.startDate ?? undefined,
            endDate: sub.endDate ?? undefined,
            trialEndsAt: sub.trialEndsAt ?? undefined,
            daysRemaining: 14,
        };
    }
    async createOrder(tenantId, body) {
        return this.billingService.createOrder(tenantId, body.planId, body.billingCycle);
    }
    async verifyPayment(tenantId, body) {
        const sub = await this.billingService.verifyPayment({
            organizationId: tenantId,
            razorpayOrderId: body.razorpay_order_id,
            razorpayPaymentId: body.razorpay_payment_id,
            razorpaySignature: body.razorpay_signature,
            planId: body.planId,
            billingCycle: body.billingCycle,
        });
        const plan = await this.billingService.getPlanById(sub.planId);
        return {
            id: sub.id,
            organizationId: sub.organizationId,
            planId: sub.planId,
            planSlug: plan?.slug ?? 'unknown',
            planName: plan?.name ?? 'Unknown',
            billingCycle: sub.billingCycle,
            status: sub.status,
            startDate: sub.startDate ?? undefined,
            endDate: sub.endDate ?? undefined,
        };
    }
    async cancelSubscription(tenantId, body) {
        const sub = await this.billingService.cancelSubscription(tenantId);
        const plan = await this.billingService.getPlanById(sub.planId);
        return {
            id: sub.id,
            organizationId: sub.organizationId,
            planId: sub.planId,
            planSlug: plan?.slug ?? 'free',
            planName: plan?.name ?? 'Free',
            billingCycle: sub.billingCycle,
            status: sub.status,
            startDate: sub.startDate ?? undefined,
            endDate: sub.endDate ?? undefined,
        };
    }
    async downgradeToFree(tenantId) {
        const sub = await this.billingService.downgradeToFree(tenantId);
        return {
            id: sub.id,
            organizationId: sub.organizationId,
            planId: sub.planId,
            planSlug: 'free',
            planName: 'Free',
            billingCycle: sub.billingCycle,
            status: sub.status,
            startDate: sub.startDate ?? undefined,
        };
    }
    async handleWebhook(req, signature, body) {
        return { status: 'ok' };
    }
};
exports.BillingController = BillingController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('plans'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getPlans", null);
__decorate([
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    (0, common_1.Get)('subscription'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getSubscription", null);
__decorate([
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    (0, common_1.Get)('usage'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getUsage", null);
__decorate([
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    (0, common_1.Get)('usage/indicator'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getUsageIndicator", null);
__decorate([
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    (0, common_1.Get)('features'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getFeatureFlags", null);
__decorate([
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    (0, common_1.Get)('invoices'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getInvoices", null);
__decorate([
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    (0, common_1.Post)('trial/start'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, billing_request_dto_1.StartTrialDto]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "startTrial", null);
__decorate([
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    (0, common_1.Post)('create-order'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, billing_request_dto_1.CreateOrderDto]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "createOrder", null);
__decorate([
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    (0, common_1.Post)('verify-payment'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, billing_request_dto_1.VerifyPaymentDto]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "verifyPayment", null);
__decorate([
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    (0, common_1.Post)('cancel'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, billing_request_dto_1.CancelSubscriptionDto]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "cancelSubscription", null);
__decorate([
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    (0, common_1.Post)('downgrade'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "downgradeToFree", null);
__decorate([
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(200),
    (0, throttler_1.SkipThrottle)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('x-razorpay-signature')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "handleWebhook", null);
exports.BillingController = BillingController = __decorate([
    (0, common_1.Controller)('billing'),
    (0, throttler_1.SkipThrottle)({ auth: true }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [billing_service_1.BillingService])
], BillingController);
//# sourceMappingURL=billing.controller.js.map