import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TimeTrackingService } from './time-tracking.service';

@Controller('tasks/:taskId/time-entries')
@UseGuards(TenantGuard)
export class TimeTrackingController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Get()
  list(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.timeTrackingService.listForTask(tenantId, taskId, userId);
  }

  @Post()
  log(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('taskId') taskId: string,
    @Body() body: { minutes: number; note?: string; loggedAt?: string },
  ) {
    return this.timeTrackingService.logTime(tenantId, taskId, userId, body);
  }
}
