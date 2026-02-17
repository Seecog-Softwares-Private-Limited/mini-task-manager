import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PlanEntity } from './entities/plan.entity';
import { SubscriptionEntity } from './entities/subscription.entity';
import { InvoiceEntity } from './entities/invoice.entity';
import { PaymentEntity } from './entities/payment.entity';
import { PlansRepository } from './repositories/plans.repository';
import { SubscriptionsRepository } from './repositories/subscriptions.repository';
import { InvoicesRepository } from './repositories/invoices.repository';
import { PaymentsRepository } from './repositories/payments.repository';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlanEntity, SubscriptionEntity, InvoiceEntity, PaymentEntity]),
    AuthModule,
    OrganizationsModule,
  ],
  controllers: [BillingController],
  providers: [PlansRepository, SubscriptionsRepository, InvoicesRepository, PaymentsRepository, BillingService],
  exports: [BillingService],
})
export class BillingModule {}
