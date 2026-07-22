import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { BillingModule } from '../billing/billing.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PlatformAdminGuard } from './guards/platform-admin.guard';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminEntity } from './entities/super-admin.entity';
import { PlatformSettingEntity } from './entities/platform-setting.entity';
import { TenantUsageEntity } from './entities/tenant-usage.entity';
import { NotificationLogEntity } from './entities/notification-log.entity';
import { ImpersonationLogEntity } from './entities/impersonation-log.entity';
import { GlobalAuditLogEntity } from './entities/global-audit-log.entity';
import { UserEntity } from '../users/entities/user.entity';
import { OrganizationEntity } from '../organizations/entities/organization.entity';
import { OrganizationMemberEntity } from '../organizations/entities/organization-member.entity';
import { ProjectEntity } from '../projects/entities/project.entity';
import { TaskEntity } from '../tasks/entities/task.entity';
import { PlanEntity } from '../billing/entities/plan.entity';
import { SubscriptionEntity } from '../billing/entities/subscription.entity';
import { InvoiceEntity } from '../billing/entities/invoice.entity';
import { PlansModule } from '../../plans/plans.module';
import { FeedbacksModule } from '../feedbacks/feedbacks.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    OrganizationsModule,
    BillingModule,
    PlansModule,
    FeedbacksModule,
    TypeOrmModule.forFeature([
      SuperAdminEntity,
      PlatformSettingEntity,
      TenantUsageEntity,
      NotificationLogEntity,
      ImpersonationLogEntity,
      GlobalAuditLogEntity,
      UserEntity,
      OrganizationEntity,
      OrganizationMemberEntity,
      ProjectEntity,
      TaskEntity,
      PlanEntity,
      SubscriptionEntity,
      InvoiceEntity,
    ]),
  ],
  controllers: [AdminController, SuperAdminController],
  providers: [AdminService, PlatformAdminGuard, SuperAdminService],
})
export class AdminModule {}
