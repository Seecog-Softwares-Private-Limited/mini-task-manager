import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TasksModule } from '../tasks/tasks.module';
import { AutomationRuleEntity } from './entities/automation-rule.entity';
import { AutomationsRepository } from './automations.repository';
import { AutomationsService } from './automations.service';
import { AutomationsController } from './automations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AutomationRuleEntity]),
    AuthModule,
    BillingModule,
    OrganizationsModule,
    NotificationsModule,
    forwardRef(() => TasksModule),
  ],
  controllers: [AutomationsController],
  providers: [AutomationsRepository, AutomationsService],
  exports: [AutomationsService],
})
export class AutomationsModule {}
