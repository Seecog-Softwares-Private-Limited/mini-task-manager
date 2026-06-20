import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ProjectsModule } from '../projects/projects.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { InvitationsModule } from '../invitations/invitations.module';
import { UsersModule } from '../users/users.module';
import { PlansModule } from '../../plans/plans.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { TaskEntity } from './entities/task.entity';
import { TaskCommentEntity } from './entities/task-comment.entity';
import { TaskAttachmentEntity } from './entities/task-attachment.entity';
import { RecurringTaskTemplateEntity } from './entities/recurring-task-template.entity';
import { RecurringTaskOccurrenceEntity } from './entities/recurring-task-occurrence.entity';
import { TasksRepository } from './repositories/tasks.repository';
import { TaskCommentsRepository } from './repositories/task-comments.repository';
import { TaskAttachmentsRepository } from './repositories/task-attachments.repository';
import { RecurringTaskTemplatesRepository } from './repositories/recurring-task-templates.repository';
import { RecurringTaskOccurrencesRepository } from './repositories/recurring-task-occurrences.repository';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { RecurringTasksController } from './recurring-tasks.controller';
import { RecurringTasksService } from './recurring-tasks.service';
import { RecurringTasksCron } from './recurring-tasks.cron';
import { TaskTimeEntryEntity } from './entities/task-time-entry.entity';
import { TaskTimeEntriesRepository } from './repositories/task-time-entries.repository';
import { TimeTrackingService } from './time-tracking.service';
import { TimeTrackingController } from './time-tracking.controller';
import { OrgEventsModule } from '../org-events/org-events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskEntity,
      TaskCommentEntity,
      TaskAttachmentEntity,
      RecurringTaskTemplateEntity,
      RecurringTaskOccurrenceEntity,
      TaskTimeEntryEntity,
    ]),
    AuthModule,
    BillingModule,
    OrganizationsModule,
    forwardRef(() => ProjectsModule),
    forwardRef(() => WorkflowsModule),
    InvitationsModule,
    UsersModule,
    NotificationsModule,
    ActivityLogsModule,
    forwardRef(() => PlansModule),
    forwardRef(() => OrgEventsModule),
  ],
  controllers: [TasksController, RecurringTasksController, TimeTrackingController],
  providers: [
    TasksRepository,
    TaskCommentsRepository,
    TaskAttachmentsRepository,
    RecurringTaskTemplatesRepository,
    RecurringTaskOccurrencesRepository,
    TaskTimeEntriesRepository,
    TasksService,
    RecurringTasksService,
    RecurringTasksCron,
    TimeTrackingService,
  ],
  exports: [TasksService, TasksRepository],
})
export class TasksModule {}
