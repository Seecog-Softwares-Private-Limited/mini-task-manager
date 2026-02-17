import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ProjectsModule } from '../projects/projects.module';
import { WorkflowEntity } from './entities/workflow.entity';
import { WorkflowStatusEntity } from './entities/workflow-status.entity';
import { WorkflowsRepository } from './repositories/workflows.repository';
import { WorkflowStatusesRepository } from './repositories/workflow-statuses.repository';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkflowEntity, WorkflowStatusEntity]),
    AuthModule,
    OrganizationsModule,
    ProjectsModule,
  ],
  controllers: [WorkflowsController],
  providers: [WorkflowsRepository, WorkflowStatusesRepository, WorkflowsService],
  exports: [WorkflowsService, WorkflowsRepository, WorkflowStatusesRepository],
})
export class WorkflowsModule {}
