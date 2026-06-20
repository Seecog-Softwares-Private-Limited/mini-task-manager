import { Injectable, Logger } from '@nestjs/common';
import type { UserPlanSlug } from '../../config/plans.config';
import { OrganizationsRepository } from '../organizations/repositories/organizations.repository';
import { PlansRepository } from './repositories/plans.repository';
import { SubscriptionsRepository } from './repositories/subscriptions.repository';

/** Maps legacy user-plan slugs to org subscription slugs. */
const USER_TO_ORG_PLAN: Record<UserPlanSlug, string> = {
  free: 'free',
  silver: 'starter',
  gold: 'pro',
};

const ORG_TO_USER_PLAN: Record<string, UserPlanSlug> = {
  free: 'free',
  starter: 'silver',
  pro: 'gold',
  enterprise: 'gold',
};

@Injectable()
export class UnifiedBillingService {
  private readonly logger = new Logger(UnifiedBillingService.name);

  constructor(
    private readonly plansRepository: PlansRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  mapUserPlanToOrgSlug(userPlan: UserPlanSlug): string {
    return USER_TO_ORG_PLAN[userPlan] ?? 'free';
  }

  mapOrgSlugToUserPlan(orgSlug: string): UserPlanSlug {
    return ORG_TO_USER_PLAN[orgSlug] ?? 'free';
  }

  async ensureFreeSubscription(organizationId: string): Promise<void> {
    const existing = await this.subscriptionsRepository.findByOrganization(organizationId);
    if (existing) return;

    const freePlan = await this.plansRepository.findBySlug('free');
    if (!freePlan) {
      this.logger.warn(`Free org plan missing; cannot provision subscription for org ${organizationId}`);
      return;
    }

    const now = new Date();
    await this.subscriptionsRepository.create({
      organizationId,
      planId: freePlan.id,
      status: 'ACTIVE',
      billingCycle: 'monthly',
      startDate: now,
    });
    this.logger.log(`Provisioned free subscription for org ${organizationId}`);
  }

  /** When user upgrades via /plans, sync owned workspaces to matching org plan. */
  async syncUserPlanToOwnedOrganizations(userId: string, userPlan: UserPlanSlug): Promise<void> {
    const orgSlug = this.mapUserPlanToOrgSlug(userPlan);
    const plan = await this.plansRepository.findBySlug(orgSlug);
    if (!plan) return;

    const owned = await this.organizationsRepository.findByOwnerId(userId);
    const now = new Date();
    for (const org of owned) {
      const sub = await this.subscriptionsRepository.findByOrganization(org.id);
      if (sub) {
        sub.planId = plan.id;
        sub.status = 'ACTIVE';
        sub.startDate = sub.startDate ?? now;
        sub.trialEndsAt = null;
        sub.cancelledAt = null;
        await this.subscriptionsRepository.save(sub);
      } else {
        await this.subscriptionsRepository.create({
          organizationId: org.id,
          planId: plan.id,
          status: 'ACTIVE',
          billingCycle: 'monthly',
          startDate: now,
        });
      }
    }
  }
}
