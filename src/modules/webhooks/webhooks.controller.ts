import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
@UseGuards(TenantGuard, RolesGuard)
@Roles('owner', 'admin')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  list(@TenantId() tenantId: string, @CurrentUserId() userId: string) {
    return this.webhooksService.list(tenantId, userId);
  }

  @Post()
  create(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() body: { name: string; url: string; events: string[] },
  ) {
    return this.webhooksService.create(tenantId, userId, body);
  }

  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ) {
    return this.webhooksService.remove(tenantId, userId, id);
  }
}
