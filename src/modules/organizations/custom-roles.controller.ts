import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CustomRolesService } from './custom-roles.service';

@Controller('custom-roles')
@UseGuards(TenantGuard, RolesGuard)
@Roles('owner', 'admin')
export class CustomRolesController {
  constructor(private readonly customRolesService: CustomRolesService) {}

  @Get()
  list(@TenantId() tenantId: string, @CurrentUserId() userId: string) {
    return this.customRolesService.list(tenantId, userId);
  }

  @Put()
  upsert(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() body: { roleKey: string; label: string; permissions: Record<string, boolean> },
  ) {
    return this.customRolesService.upsert(tenantId, userId, body);
  }
}
