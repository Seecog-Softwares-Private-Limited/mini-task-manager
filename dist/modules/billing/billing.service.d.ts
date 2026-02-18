import { PlansRepository } from './repositories/plans.repository';
import { SubscriptionsRepository } from './repositories/subscriptions.repository';
import { InvoicesRepository } from './repositories/invoices.repository';
import { PaymentsRepository } from './repositories/payments.repository';
import { PlanEntity } from './entities/plan.entity';
import { SubscriptionEntity } from './entities/subscription.entity';
export declare class BillingService {
    private readonly plansRepository;
    private readonly subscriptionsRepository;
    private readonly invoicesRepository;
    private readonly paymentsRepository;
    constructor(plansRepository: PlansRepository, subscriptionsRepository: SubscriptionsRepository, invoicesRepository: InvoicesRepository, paymentsRepository: PaymentsRepository);
    getPlans(): Promise<PlanEntity[]>;
    getSubscriptionForOrganization(organizationId: string): Promise<SubscriptionEntity | null>;
    getInvoicesForSubscription(subscriptionId: string): Promise<import("./entities/invoice.entity").InvoiceEntity[]>;
}
