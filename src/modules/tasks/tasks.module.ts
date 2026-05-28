import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ProjectsModule } from '../projects/projects.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { InvitationsModule } from '../invitations/invitations.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { TaskEntity } from './entities/task.entity';
import { TaskCommentEntity } from './entities/task-comment.entity';
import { TaskAttachmentEntity } from './entities/task-attachment.entity';
import { TasksRepository } from './repositories/tasks.repository';
import { TaskCommentsRepository } from './repositories/task-comments.repository';
import { TaskAttachmentsRepository } from './repositories/task-attachments.repository';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskEntity, TaskCommentEntity, TaskAttachmentEntity]),
    AuthModule,
    BillingModule,
    OrganizationsModule,
    forwardRef(() => ProjectsModule),
    forwardRef(() => WorkflowsModule),
    InvitationsModule,
    UsersModule,
    NotificationsModule,
    ActivityLogsModule,
  ],
  controllers: [TasksController],
  providers: [TasksRepository, TaskCommentsRepository, TaskAttachmentsRepository, TasksService],
  exports: [TasksService, TasksRepository],
})
export class TasksModule {}
