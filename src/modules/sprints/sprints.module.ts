import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ProjectsModule } from '../projects/projects.module';
import { SprintEntity } from './entities/sprint.entity';
import { SprintsRepository } from './repositories/sprints.repository';
import { SprintsService } from './sprints.service';
import { SprintsController } from './sprints.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SprintEntity]),
    forwardRef(() => AuthModule),
    forwardRef(() => OrganizationsModule),
    forwardRef(() => ProjectsModule),
  ],
  controllers: [SprintsController],
  providers: [SprintsRepository, SprintsService],
  exports: [SprintsService, SprintsRepository],
})
export class SprintsModule {}
