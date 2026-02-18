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
exports.BillingService = void 0;
const common_1 = require("@nestjs/common");
const plans_repository_1 = require("./repositories/plans.repository");
const subscriptions_repository_1 = require("./repositories/subscriptions.repository");
const invoices_repository_1 = require("./repositories/invoices.repository");
const payments_repository_1 = require("./repositories/payments.repository");
let BillingService = class BillingService {
    constructor(plansRepository, subscriptionsRepository, invoicesRepository, paymentsRepository) {
        this.plansRepository = plansRepository;
        this.subscriptionsRepository = subscriptionsRepository;
        this.invoicesRepository = invoicesRepository;
        this.paymentsRepository = paymentsRepository;
    }
    async getPlans() {
        return this.plansRepository.findActive();
    }
    async getSubscriptionForOrganization(organizationId) {
        return this.subscriptionsRepository.findByOrganization(organizationId);
    }
    async getInvoicesForSubscription(subscriptionId) {
        return this.invoicesRepository.findBySubscription(subscriptionId);
    }
};
exports.BillingService = BillingService;
exports.BillingService = BillingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [plans_repository_1.PlansRepository,
        subscriptions_repository_1.SubscriptionsRepository,
        invoices_repository_1.InvoicesRepository,
        payments_repository_1.PaymentsRepository])
], BillingService);
//# sourceMappingURL=billing.service.js.map