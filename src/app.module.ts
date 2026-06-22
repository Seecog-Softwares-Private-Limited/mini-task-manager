import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CompositeAuthGuard } from './modules/auth/guards/composite-auth.guard';
import { LastSeenInterceptor } from './modules/users/last-seen.interceptor';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { ThrottleModule } from './infrastructure/throttle/throttle.module';
import { HealthModule } from './infrastructure/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { SprintsModule } from './modules/sprints/sprints.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { CustomFieldsModule } from './modules/custom-fields/custom-fields.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { BillingModule } from './modules/billing/billing.module';
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AdminModule } from './modules/admin/admin.module';
import { PlansModule } from './plans/plans.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { SavedViewsModule } from './modules/saved-views/saved-views.module';
import { ExportModule } from './modules/export/export.module';
import { OrgEventsModule } from './modules/org-events/org-events.module';
import { RootController } from './root.controller';

@Module({
  controllers: [RootController],
  providers: [
    { provide: APP_GUARD, useClass: CompositeAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: LastSeenInterceptor },
  ],
  imports: [
    ConfigModule,
    ThrottleModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    ApiKeysModule,
    UsersModule,
    OrganizationsModule,
    ProjectsModule,
    WorkflowsModule,
    SprintsModule,
    TasksModule,
    AttachmentsModule,
    CustomFieldsModule,
    NotificationsModule,
    BillingModule,
    ActivityLogsModule,
    InvitationsModule,
    ApiKeysModule,
    AnalyticsModule,
    AdminModule,
    PlansModule,
    WebhooksModule,
    AutomationsModule,
    IntegrationsModule,
    SavedViewsModule,
    ExportModule,
    OrgEventsModule,
  ],
})
export class AppModule {}
