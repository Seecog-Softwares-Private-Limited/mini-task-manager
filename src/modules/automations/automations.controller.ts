import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AutomationsService } from './automations.service';

@Controller('automations')
@UseGuards(TenantGuard, RolesGuard)
@Roles('owner', 'admin')
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Get()
  list(@TenantId() tenantId: string, @CurrentUserId() userId: string) {
    return this.automationsService.list(tenantId, userId);
  }

  @Post()
  create(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body()
    body: {
      name: string;
      projectId?: string;
      triggerType: string;
      triggerConfig?: Record<string, unknown>;
      actionType: string;
      actionConfig: Record<string, unknown>;
    },
  ) {
    return this.automationsService.create(tenantId, userId, body as any);
  }

  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ) {
    return this.automationsService.remove(tenantId, userId, id);
  }
}
