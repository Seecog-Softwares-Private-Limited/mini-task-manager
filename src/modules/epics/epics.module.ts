import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { EpicEntity } from './entities/epic.entity';
import { EpicsRepository } from './repositories/epics.repository';
import { EpicsService } from './epics.service';
import { EpicsController } from './epics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([EpicEntity]),
    forwardRef(() => AuthModule),
    forwardRef(() => OrganizationsModule),
    ActivityLogsModule,
  ],
  controllers: [EpicsController],
  providers: [EpicsRepository, EpicsService],
  exports: [EpicsService, EpicsRepository],
})
export class EpicsModule {}
