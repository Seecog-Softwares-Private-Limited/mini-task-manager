import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ProjectsModule } from '../projects/projects.module';
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
    OrganizationsModule,
    ProjectsModule,
  ],
  controllers: [TasksController],
  providers: [TasksRepository, TaskCommentsRepository, TaskAttachmentsRepository, TasksService],
  exports: [TasksService, TasksRepository],
})
export class TasksModule {}
