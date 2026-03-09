import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { LastSeenInterceptor } from './modules/users/last-seen.interceptor';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { HealthModule } from './infrastructure/health/health.module';
import { ThrottleModule } from './infrastructure/throttle/throttle.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { SprintsModule } from './modules/sprints/sprints.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { CustomFieldsModule } from './modules/custom-fields/custom-fields.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { BillingModule } from './modules/billing/billing.module';
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { RootController } from './root.controller';

@Module({
  controllers: [RootController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: LastSeenInterceptor },
  ],
  imports: [
    ConfigModule,
    DatabaseModule,
    HealthModule,
    ThrottleModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ProjectsModule,
    WorkflowsModule,
    SprintsModule,
    TasksModule,
    CustomFieldsModule,
    NotificationsModule,
    BillingModule,
    ActivityLogsModule,
    InvitationsModule,
    ApiKeysModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
