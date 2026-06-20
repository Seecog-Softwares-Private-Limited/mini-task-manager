import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PlanEntity } from './entities/plan.entity';
import { SubscriptionEntity } from './entities/subscription.entity';
import { InvoiceEntity } from './entities/invoice.entity';
import { PaymentEntity } from './entities/payment.entity';
import { OrganizationUsageEntity } from './entities/organization-usage.entity';
import { PlansRepository } from './repositories/plans.repository';
import { SubscriptionsRepository } from './repositories/subscriptions.repository';
import { InvoicesRepository } from './repositories/invoices.repository';
import { PaymentsRepository } from './repositories/payments.repository';
import { UsageService } from './usage.service';
import { RazorpayService } from './razorpay.service';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PlanSeedService } from './plan-seed.service';
import { SubscriptionGuard } from './guards/subscription.guard';
import { UnifiedBillingService } from './unified-billing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlanEntity,
      SubscriptionEntity,
      InvoiceEntity,
      PaymentEntity,
      OrganizationUsageEntity,
    ]),
    ScheduleModule.forRoot(),
    forwardRef(() => AuthModule),
    forwardRef(() => OrganizationsModule),
  ],
  controllers: [BillingController],
  providers: [
    PlansRepository,
    SubscriptionsRepository,
    InvoicesRepository,
    PaymentsRepository,
    UsageService,
    RazorpayService,
    BillingService,
    PlanSeedService,
    SubscriptionGuard,
    UnifiedBillingService,
  ],
  exports: [BillingService, UsageService, RazorpayService, SubscriptionGuard, UnifiedBillingService],
})
export class BillingModule {}
