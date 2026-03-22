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
var BillingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const plans_repository_1 = require("./repositories/plans.repository");
const subscriptions_repository_1 = require("./repositories/subscriptions.repository");
const invoices_repository_1 = require("./repositories/invoices.repository");
const payments_repository_1 = require("./repositories/payments.repository");
const razorpay_service_1 = require("./razorpay.service");
const usage_service_1 = require("./usage.service");
let BillingService = BillingService_1 = class BillingService {
    constructor(plansRepository, subscriptionsRepository, invoicesRepository, paymentsRepository, razorpayService, usageService) {
        this.plansRepository = plansRepository;
        this.subscriptionsRepository = subscriptionsRepository;
        this.invoicesRepository = invoicesRepository;
        this.paymentsRepository = paymentsRepository;
        this.razorpayService = razorpayService;
        this.usageService = usageService;
        this.logger = new common_1.Logger(BillingService_1.name);
    }
    async getPlans() {
        return this.plansRepository.findActive();
    }
    async getPlanById(planId) {
        return this.plansRepository.findById(planId);
    }
    async getPlanBySlug(slug) {
        return this.plansRepository.findBySlug(slug);
    }
    async getSubscriptionForOrganization(organizationId) {
        return this.subscriptionsRepository.findByOrganization(organizationId);
    }
    async getUsage(organizationId) {
        return this.usageService.getOrganizationUsage(organizationId);
    }
    async getFeatureFlags(organizationId) {
        return this.usageService.getFeatureFlags(organizationId);
    }
    async startTrial(organizationId, planSlug = 'pro') {
        const existing = await this.subscriptionsRepository.findByOrganization(organizationId);
        const plan = await this.plansRepository.findBySlug(planSlug);
        if (existing?.status === 'TRIAL') {
            throw new common_1.BadRequestException('You already have an active trial.');
        }
        if (existing?.status === 'ACTIVE') {
            const currentPlan = existing.plan ?? (existing.planId ? await this.plansRepository.findById(existing.planId) : null);
            const isOnFreePlan = currentPlan?.slug === 'free';
            if (!isOnFreePlan) {
                throw new common_1.BadRequestException('You already have an active subscription.');
            }
        }
        if (!plan)
            throw new common_1.NotFoundException('Plan not found');
        const now = new Date();
        const trialEnd = new Date(now);
        trialEnd.setDate(trialEnd.getDate() + 14);
        if (existing) {
            existing.plan = undefined;
            existing.planId = plan.id;
            existing.status = 'TRIAL';
            existing.billingCycle = 'monthly';
            existing.startDate = now;
            existing.trialEndsAt = trialEnd;
            existing.endDate = trialEnd;
            existing.cancelledAt = null;
            return this.subscriptionsRepository.save(existing);
        }
        return this.subscriptionsRepository.create({
            organizationId,
            planId: plan.id,
            billingCycle: 'monthly',
            status: 'TRIAL',
            startDate: now,
            trialEndsAt: trialEnd,
            endDate: trialEnd,
        });
    }
    async createOrder(organizationId, planId, billingCycle) {
        const plan = await this.plansRepository.findById(planId);
        if (!plan)
            throw new common_1.NotFoundException('Plan not found');
        if (!plan.isActive)
            throw new common_1.BadRequestException('Plan is not available');
        if (plan.slug === 'free')
            throw new common_1.BadRequestException('Free plan does not require payment');
        const price = billingCycle === 'yearly' ? Number(plan.priceYearly) : Number(plan.priceMonthly);
        if (price <= 0)
            throw new common_1.BadRequestException('Invalid plan price');
        const usage = await this.usageService.getOrganizationUsage(organizationId);
        const userCount = Math.max(1, usage.users.current);
        const totalAmount = Math.round(price * userCount * 100);
        const order = await this.razorpayService.createOrder({
            amount: totalAmount,
            currency: plan.currency || 'INR',
            receipt: `sub_${organizationId.slice(0, 8)}_${Date.now()}`,
            notes: {
                organizationId,
                planId,
                billingCycle,
                planName: plan.name,
                userCount: String(userCount),
            },
        });
        const subscription = await this.subscriptionsRepository.findByOrganization(organizationId);
        if (subscription) {
            await this.paymentsRepository.create({
                subscriptionId: subscription.id,
                amount: totalAmount / 100,
                currency: plan.currency || 'INR',
                status: 'PENDING',
                razorpayOrderId: order.id,
                metadata: { planId, billingCycle, userCount },
            });
        }
        return {
            orderId: order.id,
            amount: totalAmount,
            currency: plan.currency || 'INR',
            keyId: this.razorpayService.getKeyId(),
            planName: plan.name,
            billingCycle,
        };
    }
    async verifyPayment(params) {
        const isValid = this.razorpayService.verifyPaymentSignature({
            orderId: params.razorpayOrderId,
            paymentId: params.razorpayPaymentId,
            signature: params.razorpaySignature,
        });
        if (!isValid) {
            throw new common_1.BadRequestException('Payment verification failed. Invalid signature.');
        }
        const paymentDetails = await this.razorpayService.fetchPayment(params.razorpayPaymentId);
        const plan = await this.plansRepository.findById(params.planId);
        if (!plan)
            throw new common_1.NotFoundException('Plan not found');
        const now = new Date();
        const endDate = new Date(now);
        if (params.billingCycle === 'yearly') {
            endDate.setFullYear(endDate.getFullYear() + 1);
        }
        else {
            endDate.setMonth(endDate.getMonth() + 1);
        }
        let subscription = await this.subscriptionsRepository.findByOrganization(params.organizationId);
        if (subscription) {
            subscription.plan = undefined;
            subscription.planId = params.planId;
            subscription.billingCycle = params.billingCycle;
            subscription.status = 'ACTIVE';
            subscription.startDate = now;
            subscription.endDate = endDate;
            subscription.trialEndsAt = null;
            subscription.cancelledAt = null;
            subscription.razorpaySubscriptionId = params.razorpayPaymentId;
            await this.subscriptionsRepository.save(subscription);
        }
        else {
            await this.subscriptionsRepository.create({
                organizationId: params.organizationId,
                planId: params.planId,
                billingCycle: params.billingCycle,
                status: 'ACTIVE',
                startDate: now,
                endDate,
                razorpaySubscriptionId: params.razorpayPaymentId,
            });
        }
        const reloaded = await this.subscriptionsRepository.findByOrganization(params.organizationId);
        if (!reloaded) {
            throw new common_1.NotFoundException('Subscription not found after payment');
        }
        subscription = reloaded;
        const payment = await this.paymentsRepository.findByRazorpayOrderId(params.razorpayOrderId);
        if (payment) {
            payment.razorpayPaymentId = params.razorpayPaymentId;
            payment.razorpaySignature = params.razorpaySignature;
            payment.status = 'SUCCESS';
            payment.paidAt = now;
            payment.method = paymentDetails.method || null;
            payment.metadata = paymentDetails;
            await this.paymentsRepository.save(payment);
        }
        const usage = await this.usageService.getOrganizationUsage(params.organizationId);
        const userCount = Math.max(1, usage.users.current);
        const price = params.billingCycle === 'yearly' ? Number(plan.priceYearly) : Number(plan.priceMonthly);
        await this.invoicesRepository.create({
            subscriptionId: subscription.id,
            organizationId: params.organizationId,
            amount: price * userCount,
            currency: plan.currency || 'INR',
            status: 'PAID',
            billingCycle: params.billingCycle,
            planName: plan.name,
            userCount,
            paidAt: now,
            razorpayInvoiceId: params.razorpayPaymentId,
        });
        this.logger.log(`Payment verified for org ${params.organizationId}, plan: ${plan.name}, cycle: ${params.billingCycle}`);
        return subscription;
    }
    async downgradeToFree(organizationId) {
        const freePlan = await this.plansRepository.findBySlug('free');
        if (!freePlan)
            throw new common_1.NotFoundException('Free plan not configured');
        let subscription = await this.subscriptionsRepository.findByOrganization(organizationId);
        const now = new Date();
        if (subscription) {
            subscription.plan = undefined;
            subscription.planId = freePlan.id;
            subscription.status = 'ACTIVE';
            subscription.billingCycle = 'monthly';
            subscription.startDate = now;
            subscription.endDate = null;
            subscription.trialEndsAt = null;
            subscription.cancelledAt = null;
            return this.subscriptionsRepository.save(subscription);
        }
        return this.subscriptionsRepository.create({
            organizationId,
            planId: freePlan.id,
            billingCycle: 'monthly',
            status: 'ACTIVE',
            startDate: now,
        });
    }
    async cancelSubscription(organizationId) {
        const subscription = await this.subscriptionsRepository.findByOrganization(organizationId);
        if (!subscription)
            throw new common_1.NotFoundException('No subscription found');
        subscription.status = 'CANCELLED';
        subscription.cancelledAt = new Date();
        const updated = await this.subscriptionsRepository.save(subscription);
        return this.downgradeToFree(organizationId);
    }
    async getInvoicesForOrganization(organizationId) {
        return this.invoicesRepository.findByOrganization(organizationId);
    }
    async getPaymentsForSubscription(subscriptionId) {
        return this.paymentsRepository.findBySubscription(subscriptionId);
    }
    async handleTrialExpiry() {
        try {
            const expiredTrials = await this.subscriptionsRepository.findExpiredTrials();
            for (const sub of expiredTrials) {
                this.logger.log(`Trial expired for org ${sub.organizationId}, downgrading to free`);
                await this.downgradeToFree(sub.organizationId);
            }
            if (expiredTrials.length > 0) {
                this.logger.log(`Processed ${expiredTrials.length} expired trials`);
            }
        }
        catch (error) {
            this.logger.error('Error processing trial expirations', error);
        }
    }
};
exports.BillingService = BillingService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BillingService.prototype, "handleTrialExpiry", null);
exports.BillingService = BillingService = BillingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [plans_repository_1.PlansRepository,
        subscriptions_repository_1.SubscriptionsRepository,
        invoices_repository_1.InvoicesRepository,
        payments_repository_1.PaymentsRepository,
        razorpay_service_1.RazorpayService,
        usage_service_1.UsageService])
], BillingService);
//# sourceMappingURL=billing.service.js.map