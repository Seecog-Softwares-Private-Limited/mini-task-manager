import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { SavedViewsService } from './saved-views.service';

@Controller('saved-views')
@UseGuards(TenantGuard)
export class SavedViewsController {
  constructor(private readonly savedViewsService: SavedViewsService) {}

  @Get()
  list(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Query('projectId') projectId: string,
  ) {
    return this.savedViewsService.list(tenantId, projectId, userId);
  }

  @Post()
  create(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() body: { projectId: string; name: string; filters: Record<string, unknown>; isShared?: boolean },
  ) {
    return this.savedViewsService.create(tenantId, body.projectId, userId, body);
  }

  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ) {
    return this.savedViewsService.remove(tenantId, userId, id);
  }
}
