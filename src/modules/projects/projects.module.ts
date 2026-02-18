import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { WorkflowsModule } from '../workflows/workflows.module';
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
  ],
  controllers: [ProjectsController],
  providers: [ProjectsRepository, ProjectMembersRepository, ProjectsService],
  exports: [ProjectsService, ProjectsRepository],
})
export class ProjectsModule {}
