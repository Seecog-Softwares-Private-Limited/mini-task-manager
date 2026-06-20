import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';

@Module({
  imports: [AuthModule, OrganizationsModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
