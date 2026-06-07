import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RecurringTasksService } from './recurring-tasks.service';
import {
  CompleteRecurringTaskDto,
  RecurringTasksQueryDto,
  SkipNextOccurrenceDto,
  UpdateRecurringTemplateDto,
} from './dto/recurring-actions.dto';

@Controller('recurring-tasks')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard, TenantGuard)
export class RecurringTasksController {
  constructor(private readonly recurringTasksService: RecurringTasksService) {}

  @Get('summary')
  async getSummary(
    @TenantId() organizationId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.recurringTasksService.getSummary(organizationId, projectId);
  }

  @Get()
  async list(
    @TenantId() organizationId: string,
    @Query() query: RecurringTasksQueryDto,
  ) {
    return this.recurringTasksService.listTemplates(organizationId, query);
  }

  @Get(':id/history')
  async history(
    @Param('id') id: string,
    @TenantId() organizationId: string,
  ) {
    return this.recurringTasksService.getTemplateHistory(id, organizationId);
  }

  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @Patch(':id')
  async updateTemplate(
    @Param('id') id: string,
    @TenantId() organizationId: string,
    @Body() dto: UpdateRecurringTemplateDto,
  ) {
    return this.recurringTasksService.updateTemplate(id, organizationId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @Post(':id/pause')
  async pause(@Param('id') id: string, @TenantId() organizationId: string) {
    return this.recurringTasksService.pauseTemplate(id, organizationId);
  }

  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @Post(':id/resume')
  async resume(@Param('id') id: string, @TenantId() organizationId: string) {
    return this.recurringTasksService.resumeTemplate(id, organizationId);
  }

  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @Post(':id/skip-next')
  async skipNext(
    @Param('id') id: string,
    @TenantId() organizationId: string,
    @Body() dto: SkipNextOccurrenceDto,
  ) {
    return this.recurringTasksService.skipNextOccurrence(id, organizationId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @Delete(':id')
  async deleteSeries(@Param('id') id: string, @TenantId() organizationId: string) {
    return this.recurringTasksService.deleteSeries(id, organizationId);
  }

  @Post('tasks/:taskId/complete')
  async completeWithAction(
    @Param('taskId') taskId: string,
    @TenantId() organizationId: string,
    @Body() dto: CompleteRecurringTaskDto,
  ) {
    return this.recurringTasksService.completeTaskWithRecurringAction(taskId, organizationId, dto);
  }
}

