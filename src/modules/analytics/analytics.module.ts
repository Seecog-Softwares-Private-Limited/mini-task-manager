import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ActivityLogEntity } from '../activity-logs/entities/activity-log.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { InvitationsModule } from '../invitations/invitations.module';
import { BillingModule } from '../billing/billing.module';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ActivityLogEntity]),
    AuthModule,
    OrganizationsModule,
    ProjectsModule,
    TasksModule,
    InvitationsModule,
    BillingModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
