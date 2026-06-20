import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { OrganizationIntegrationEntity } from './entities/organization-integration.entity';
import { IntegrationsRepository } from './integrations.repository';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizationIntegrationEntity]),
    AuthModule,
    BillingModule,
    OrganizationsModule,
  ],
  controllers: [IntegrationsController],
  providers: [IntegrationsRepository, IntegrationsService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
