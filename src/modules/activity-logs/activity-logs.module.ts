import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ActivityLogEntity } from './entities/activity-log.entity';
import { ActivityLogsRepository } from './repositories/activity-logs.repository';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLogsController } from './activity-logs.controller';

import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityLogEntity]), AuthModule, OrganizationsModule, BillingModule],
  controllers: [ActivityLogsController],
  providers: [ActivityLogsRepository, ActivityLogsService],
  exports: [ActivityLogsService, ActivityLogsRepository],
})
export class ActivityLogsModule {}
