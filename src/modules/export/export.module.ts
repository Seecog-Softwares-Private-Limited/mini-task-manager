import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => OrganizationsModule),
  ],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
