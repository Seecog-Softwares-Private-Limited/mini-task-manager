import { Injectable } from '@nestjs/common';
import { PlansRepository } from './repositories/plans.repository';
import { SubscriptionsRepository } from './repositories/subscriptions.repository';
import { InvoicesRepository } from './repositories/invoices.repository';
import { PaymentsRepository } from './repositories/payments.repository';
import { PlanEntity } from './entities/plan.entity';
import { SubscriptionEntity } from './entities/subscription.entity';

@Injectable()
export class BillingService {
  constructor(
    private readonly plansRepository: PlansRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly invoicesRepository: InvoicesRepository,
    private readonly paymentsRepository: PaymentsRepository,
  ) {}

  async getPlans(): Promise<PlanEntity[]> {
    return this.plansRepository.findActive();
  }

  async getSubscriptionForOrganization(organizationId: string): Promise<SubscriptionEntity | null> {
    return this.subscriptionsRepository.findByOrganization(organizationId);
  }

  async getInvoicesForSubscription(subscriptionId: string) {
    return this.invoicesRepository.findBySubscription(subscriptionId);
  }
}
