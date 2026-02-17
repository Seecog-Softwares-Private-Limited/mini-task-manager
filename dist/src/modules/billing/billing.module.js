"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("../auth/auth.module");
const organizations_module_1 = require("../organizations/organizations.module");
const plan_entity_1 = require("./entities/plan.entity");
const subscription_entity_1 = require("./entities/subscription.entity");
const invoice_entity_1 = require("./entities/invoice.entity");
const payment_entity_1 = require("./entities/payment.entity");
const plans_repository_1 = require("./repositories/plans.repository");
const subscriptions_repository_1 = require("./repositories/subscriptions.repository");
const invoices_repository_1 = require("./repositories/invoices.repository");
const payments_repository_1 = require("./repositories/payments.repository");
const billing_service_1 = require("./billing.service");
const billing_controller_1 = require("./billing.controller");
let BillingModule = class BillingModule {
};
exports.BillingModule = BillingModule;
exports.BillingModule = BillingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([plan_entity_1.PlanEntity, subscription_entity_1.SubscriptionEntity, invoice_entity_1.InvoiceEntity, payment_entity_1.PaymentEntity]),
            auth_module_1.AuthModule,
            organizations_module_1.OrganizationsModule,
        ],
        controllers: [billing_controller_1.BillingController],
        providers: [plans_repository_1.PlansRepository, subscriptions_repository_1.SubscriptionsRepository, invoices_repository_1.InvoicesRepository, payments_repository_1.PaymentsRepository, billing_service_1.BillingService],
        exports: [billing_service_1.BillingService],
    })
], BillingModule);
//# sourceMappingURL=billing.module.js.map