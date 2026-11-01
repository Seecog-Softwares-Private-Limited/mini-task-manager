import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { IssueEntity } from './entities/issue.entity';
import { IssuesRepository } from './repositories/issues.repository';
import { IssuesService } from './issues.service';
import { IssuesController } from './issues.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([IssueEntity]),
    forwardRef(() => AuthModule),
    ActivityLogsModule,
  ],
  controllers: [IssuesController],
  providers: [IssuesRepository, IssuesService],
  exports: [IssuesService],
})
export class IssuesModule {}
