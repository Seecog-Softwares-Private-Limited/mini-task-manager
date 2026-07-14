import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RecurringTasksService } from './recurring-tasks.service';
import { TaskResponseDto } from './dto/task-response.dto';
import { formatUuid } from '../../common/utils/uuid.util';
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

  @Get('board')
  async getBoard(
    @TenantId() organizationId: string,
    @Query('projectId') projectId: string,
    @Query('statusIds') statusIds?: string,
    @Query('sync') sync?: string,
    @Query('calendarOnly') calendarOnly?: string,
  ) {
    const validStatusIds = statusIds?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
    const view = await this.recurringTasksService.getBoardView(organizationId, projectId, validStatusIds, {
      sync: sync !== 'false',
      calendarOnly: calendarOnly === 'true',
    });
    return {
      tasks: view.tasks.map((t) => this.toTaskResponse(t)),
      overdueTaskIds: view.overdueTaskIds,
    };
  }

  @Post('sync')
  async syncBoard(
    @TenantId() organizationId: string,
    @Query('projectId') projectId: string,
  ) {
    return this.recurringTasksService.syncBoardTasks(organizationId, projectId);
  }

  @Get('summary')
  async getSummary(
    @TenantId() organizationId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.recurringTasksService.getSummary(organizationId, projectId);
  }

  @Get('analytics')
  async analytics(
    @TenantId() organizationId: string,
    @Query('projectId') projectId?: string,
    @Query('days') days?: string,
  ) {
    const parsedDays = days ? parseInt(days, 10) : 30;
    return this.recurringTasksService.getAnalytics(
      organizationId,
      projectId,
      Number.isFinite(parsedDays) ? parsedDays : 30,
    );
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
  @Post(':id/archive')
  async archive(@Param('id') id: string, @TenantId() organizationId: string) {
    return this.recurringTasksService.archiveTemplate(id, organizationId);
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
  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string, @TenantId() organizationId: string) {
    return this.recurringTasksService.duplicateTemplate(id, organizationId);
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

  @Post('tasks/:taskId/ensure-subtasks')
  async ensureOccurrenceSubtasks(
    @Param('taskId') taskId: string,
    @TenantId() organizationId: string,
  ) {
    const task = await this.recurringTasksService.ensureOccurrenceSubtasks(taskId, organizationId);
    return this.toTaskResponse(task);
  }

  private toTaskResponse(t: import('./entities/task.entity').TaskEntity): TaskResponseDto {
    const id = formatUuid(t.id as string | Buffer) ?? String(t.id);
    const projectId = formatUuid(t.projectId as string | Buffer) ?? String(t.projectId);
    const organizationId = formatUuid(t.organizationId as string | Buffer) ?? String(t.organizationId);
    const statusId = t.statusId ? formatUuid(t.statusId as string | Buffer) : undefined;
    const assigneeId = t.assigneeId ? formatUuid(t.assigneeId as string | Buffer) : undefined;
    const assigneeIdsRaw = t.assigneeIds ?? (assigneeId ? [assigneeId] : undefined);
    const assigneeIds = assigneeIdsRaw
      ?.map((aid) => formatUuid(aid as string | Buffer))
      .filter((aid): aid is string => !!aid);
    return {
      id,
      projectId,
      organizationId,
      title: t.title,
      description: t.description ?? undefined,
      statusId: statusId ?? undefined,
      priority: t.priority,
      assigneeId: assigneeId ?? undefined,
      assigneeIds: assigneeIds?.length ? assigneeIds : undefined,
      assignee: t.assignee
        ? {
            id: formatUuid(t.assignee.id as string | Buffer) ?? String(t.assignee.id),
            fullName: t.assignee.fullName,
            email: t.assignee.email,
            avatarUrl: t.assignee.avatarUrl ?? undefined,
          }
        : undefined,
      reporterId: formatUuid(t.reporterId as string | Buffer) ?? String(t.reporterId),
      parentTaskId: t.parentTaskId ? formatUuid(t.parentTaskId as string | Buffer) : undefined,
      storyPoints: t.storyPoints ?? undefined,
      dueDate: t.dueDate ?? undefined,
      completedAt: t.completedAt ?? undefined,
      estimatedMinutes: t.estimatedMinutes ?? undefined,
      loggedMinutes: t.loggedMinutes,
      sprintId: t.sprintId ? formatUuid(t.sprintId as string | Buffer) : undefined,
      recurringTemplateId: t.recurringTemplateId
        ? (formatUuid(t.recurringTemplateId as string | Buffer) ?? String(t.recurringTemplateId))
        : undefined,
      recurrenceType: t.recurrenceType ?? undefined,
      recurrenceSequence: t.recurrenceSequence ?? undefined,
      tags: t.tags ?? undefined,
      subtasks: t.subtasks ?? undefined,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }
}

