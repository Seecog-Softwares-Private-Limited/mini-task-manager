import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlansService } from './plans.service';

@Injectable()
export class PlanExpiryCronService {
  private readonly logger = new Logger(PlanExpiryCronService.name);

  constructor(private readonly plansService: PlansService) {}

  /** Daily: downgrade expired paid plans to Free. */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleExpiredPlans(): Promise<void> {
    const count = await this.plansService.downgradeExpiredUsers();
    if (count > 0) {
      this.logger.log(`Downgraded ${count} expired user plan(s) to Free`);
    }
  }

  /** Daily: log / email users whose plan expires within 7 days. */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleExpiryReminders(): Promise<void> {
    const count = await this.plansService.notifyExpiringSoon();
    if (count > 0) {
      this.logger.log(`Sent ${count} plan expiry reminder(s)`);
    }
  }
}
