import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { TasksModule } from '../tasks/tasks.module';
import { BillingModule } from '../billing/billing.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectEntity } from './entities/project.entity';
import { ProjectMemberEntity } from './entities/project-member.entity';
import { ProjectsRepository } from './repositories/projects.repository';
import { ProjectMembersRepository } from './repositories/project-members.repository';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectEntity, ProjectMemberEntity]),
    AuthModule,
    OrganizationsModule,
    forwardRef(() => WorkflowsModule),
    forwardRef(() => TasksModule),
    forwardRef(() => BillingModule),
    ActivityLogsModule,
    NotificationsModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsRepository, ProjectMembersRepository, ProjectsService],
  exports: [ProjectsService, ProjectsRepository],
})
export class ProjectsModule {}
