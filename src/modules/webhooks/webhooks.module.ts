import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { OrganizationWebhookEntity } from './entities/organization-webhook.entity';
import { WebhooksRepository } from './webhooks.repository';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizationWebhookEntity]),
    AuthModule,
    BillingModule,
    OrganizationsModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksRepository, WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
