import { PlansRepository } from './repositories/plans.repository';
import { SubscriptionsRepository } from './repositories/subscriptions.repository';
import { InvoicesRepository } from './repositories/invoices.repository';
import { PaymentsRepository } from './repositories/payments.repository';
import { RazorpayService } from './razorpay.service';
import { UsageService, type OrganizationUsage } from './usage.service';
import { PlanEntity } from './entities/plan.entity';
import { SubscriptionEntity, type BillingCycle } from './entities/subscription.entity';
export declare class BillingService {
    private readonly plansRepository;
    private readonly subscriptionsRepository;
    private readonly invoicesRepository;
    private readonly paymentsRepository;
    private readonly razorpayService;
    private readonly usageService;
    private readonly logger;
    constructor(plansRepository: PlansRepository, subscriptionsRepository: SubscriptionsRepository, invoicesRepository: InvoicesRepository, paymentsRepository: PaymentsRepository, razorpayService: RazorpayService, usageService: UsageService);
    getPlans(): Promise<PlanEntity[]>;
    getPlanById(planId: string): Promise<PlanEntity | null>;
    getPlanBySlug(slug: string): Promise<PlanEntity | null>;
    getSubscriptionForOrganization(organizationId: string): Promise<SubscriptionEntity | null>;
    getUsage(organizationId: string): Promise<OrganizationUsage>;
    getFeatureFlags(organizationId: string): Promise<Record<string, unknown>>;
    startTrial(organizationId: string, planSlug?: string): Promise<SubscriptionEntity>;
    createOrder(organizationId: string, planId: string, billingCycle: BillingCycle): Promise<{
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
        planName: string;
        billingCycle: string;
    }>;
    verifyPayment(params: {
        organizationId: string;
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
        planId: string;
        billingCycle: BillingCycle;
    }): Promise<SubscriptionEntity>;
    downgradeToFree(organizationId: string): Promise<SubscriptionEntity>;
    cancelSubscription(organizationId: string): Promise<SubscriptionEntity>;
    getInvoicesForOrganization(organizationId: string): Promise<import("./entities/invoice.entity").InvoiceEntity[]>;
    getPaymentsForSubscription(subscriptionId: string): Promise<import("./entities/payment.entity").PaymentEntity[]>;
    handleTrialExpiry(): Promise<void>;
}
