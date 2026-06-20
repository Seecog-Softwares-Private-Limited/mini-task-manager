import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ExportService } from './export.service';

@Controller('export')
@UseGuards(TenantGuard, RolesGuard)
@Roles('owner', 'admin')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="workspace-export.csv"')
  async exportCsv(@TenantId() tenantId: string, @CurrentUserId() userId: string) {
    return this.exportService.exportOrganizationCsv(tenantId, userId);
  }
}
