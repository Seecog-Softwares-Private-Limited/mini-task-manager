import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PLANS,
  PLAN_ORDER,
  getPlanDefinition,
  normalizePlanSlug,
  type UserPlanSlug,
} from '../config/plans.config';
import { UserEntity } from '../modules/users/entities/user.entity';
import { PlanLimitService } from './plan-limit.service';
import { PaymentService } from './payment.service';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly planLimitService: PlanLimitService,
    private readonly paymentService: PaymentService,
  ) {}

  listPlans() {
    return PLAN_ORDER.map((slug) => {
      const def = PLANS[slug];
      return {
        slug: def.slug,
        name: def.name,
        price: def.pricing.priceMonthlyInr,
        currency: def.pricing.currency,
        priceLabel: def.pricing.label,
        limits: {
          maxWorkspaces: def.limits.maxWorkspaces,
          maxMembersPerWorkspace: def.limits.maxMembersPerWorkspace,
          storageBytes: def.limits.storageBytes,
        },
        benefits: def.benefits,
      };
    });
  }

  async getCurrent(userId: string) {
    return this.planLimitService.getCurrentPlan(userId);
  }

  async getUsage(userId: string, organizationId?: string) {
    const current = await this.planLimitService.getCurrentPlan(userId);
    if (organizationId) {
      const members = await this.planLimitService.getUsageStats(userId, organizationId);
      return { ...current, usage: { ...current.usage, members: members.members } };
    }
    return current;
  }

  async upgrade(userId: string, targetPlan: UserPlanSlug, paymentId?: string) {
    if (targetPlan === 'free') {
      throw new BadRequestException('Use downgrade endpoint to return to Free');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const current = this.planLimitService.resolveEffectivePlan(user);
    const targetIdx = PLAN_ORDER.indexOf(targetPlan);
    const currentIdx = PLAN_ORDER.indexOf(current);
    if (targetIdx <= currentIdx) {
      throw new BadRequestException(`Already on ${current} plan or higher`);
    }

    const def = getPlanDefinition(targetPlan);
    const amount = def.pricing.priceMonthlyInr;

    if (!paymentId) {
      const init = this.paymentService.initiatePayment(userId, targetPlan, amount);
      return {
        requiresPayment: true,
        payment: init,
        message: 'Complete payment then call upgrade again with paymentId',
      };
    }

    const verified = this.paymentService.verifyPayment(paymentId);
    if (!verified) {
      throw new BadRequestException('Payment verification failed — plan was not activated');
    }

    await this.activatePlan(userId, targetPlan);
    this.logger.log(`User ${userId} upgraded to ${targetPlan} (paymentId=${paymentId})`);
    return {
      requiresPayment: false,
      plan: targetPlan,
      planExpiresAt: this.paymentService.getPlanExpiryFromNow().toISOString(),
    };
  }

  async activatePlan(userId: string, plan: UserPlanSlug): Promise<void> {
    const now = new Date();
    const expires =
      plan === 'free' ? null : this.paymentService.getPlanExpiryFromNow();
    await this.userRepo.update(userId, {
      currentPlan: normalizePlanSlug(plan),
      planStartedAt: now,
      planExpiresAt: expires,
    });
  }

  async downgradeExpiredUsers(): Promise<number> {
    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('u.current_plan IN (:...plans)', { plans: ['silver', 'gold'] })
      .andWhere('u.plan_expires_at IS NOT NULL')
      .andWhere('u.plan_expires_at < :now', { now: new Date() })
      .getMany();
    for (const user of users) {
      await this.activatePlan(user.id, 'free');
      this.logger.log(`Downgraded expired plan for user ${user.id}`);
    }
    return users.length;
  }

  async notifyExpiringSoon(): Promise<number> {
    const now = new Date();
    const until = new Date();
    until.setDate(until.getDate() + 7);
    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('u.current_plan IN (:...plans)', { plans: ['silver', 'gold'] })
      .andWhere('u.plan_expires_at IS NOT NULL')
      .andWhere('u.plan_expires_at > :now', { now })
      .andWhere('u.plan_expires_at <= :until', { until })
      .getMany();
    for (const user of users) {
      this.logger.log(
        `[Plan expiry reminder] user=${user.email} plan=${user.currentPlan} expires=${user.planExpiresAt?.toISOString()}`,
      );
    }
    return users.length;
  }
}
