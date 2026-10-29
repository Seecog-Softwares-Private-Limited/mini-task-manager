import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { SiteEntity } from './entities/site.entity';
import { SitesRepository } from './repositories/sites.repository';
import { SitesService } from './sites.service';
import { SitesController } from './sites.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SiteEntity]),
    forwardRef(() => AuthModule),
    forwardRef(() => OrganizationsModule),
    ActivityLogsModule,
  ],
  controllers: [SitesController],
  providers: [SitesRepository, SitesService],
  exports: [SitesService, SitesRepository],
})
export class SitesModule {}
