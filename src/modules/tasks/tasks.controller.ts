import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  StreamableFile,
  UploadedFile,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { createReadStream } from 'fs';
import { TasksService } from './tasks.service';
import { EmailService } from '../invitations/email.service';
import { UsersService } from '../users/users.service';
import { ProjectsService } from '../projects/projects.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { getFrontendUrl } from '../../common/utils/frontend-url.util';
import { formatUuid } from '../../common/utils/uuid.util';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { PatchTaskDto } from './dto/patch-task.dto';
import { UpdateTaskAssigneeDto } from './dto/update-task-assignee.dto';
import { PaginationQueryDto } from '../../common/pagination';
import { TaskResponseDto } from './dto/task-response.dto';
import { TaskCommentEntity } from './entities/task-comment.entity';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('tasks')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard, TenantGuard)
export class TasksController {
  private readonly logger = new Logger(TasksController.name);

  constructor(
    private readonly tasksService: TasksService,
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
    private readonly projectsService: ProjectsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @Post()
  async create(
    @Body() dto: CreateTaskDto,
    @CurrentUserId() reporterId: string,
  ): Promise<TaskResponseDto> {
    const projectId = dto.projectId!;
    const organizationId = dto.organizationId!;
    const task = await this.tasksService.create(projectId, organizationId, reporterId, dto);

    // Fire-and-forget: send assignment emails + in-app notifications
    const assigneeIds = task.assigneeIds ?? (task.assigneeId ? [task.assigneeId] : []);
    if (assigneeIds.length > 0) {
      this.notifyAssignees(assigneeIds, reporterId, task.title, task.id, projectId).catch((err) =>
        this.logger.warn(`Failed to send assignment notifications: ${err}`),
      );
    }

    return this.toResponse(task);
  }

  @Get('project/:projectId')
  async findByProject(
    @Param('projectId') projectId: string,
    @TenantId() tenantId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.tasksService.findByProject(projectId, tenantId, query);
  }

  @Get('attachments/:attachmentId/file')
  @SkipThrottle({ default: true, auth: true })
  async getAttachmentFile(
    @Param('attachmentId') attachmentId: string,
    @TenantId() tenantId: string,
  ): Promise<StreamableFile> {
    const { path: filePath, fileName } = await this.tasksService.getAttachmentFile(attachmentId, tenantId);
    const stream = createReadStream(filePath);
    return new StreamableFile(stream, {
      disposition: fileName ? `attachment; filename="${fileName}"` : undefined,
    });
  }

  @Get(':id/attachments')
  async getAttachments(
    @Param('id') taskId: string,
    @TenantId() tenantId: string,
  ) {
    const task = await this.tasksService.findByIdInOrganization(taskId, tenantId);
    if (!task) return [];
    return this.tasksService.getAttachments(taskId);
  }

  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadAttachment(
    @Param('id') taskId: string,
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @UploadedFile() file: MulterFile | undefined,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.tasksService.addAttachment(taskId, tenantId, userId, file);
  }

  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @Delete(':id/attachments/:attachmentId')
  async deleteAttachment(
    @Param('id') taskId: string,
    @Param('attachmentId') attachmentId: string,
    @TenantId() tenantId: string,
  ): Promise<{ success: boolean }> {
    await this.tasksService.deleteAttachment(taskId, attachmentId, tenantId);
    return { success: true };
  }

  @Get(':id/comments')
  async getComments(
    @Param('id') taskId: string,
    @TenantId() tenantId: string,
  ) {
    const task = await this.tasksService.findByIdInOrganization(taskId, tenantId);
    if (!task) return [];
    const comments = await this.tasksService.getComments(taskId);
    return comments.map((c) => this.toCommentResponse(c));
  }

  @Post(':id/comments')
  async addComment(
    @Param('id') taskId: string,
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateTaskCommentDto,
  ) {
    const comment = await this.tasksService.addComment(taskId, tenantId, userId, dto.body);
    if (comment) {
      const task = await this.tasksService.findByIdInOrganization(taskId, tenantId);
      if (task) {
        this.notifyCommentObservers(task, userId, dto.mentionedUserIds ?? []).catch((err) =>
          this.logger.warn(`Comment notification failed: ${err}`),
        );
      }
      return this.toCommentResponse(comment);
    }
    return null;
  }

  @Delete(':id/comments/:commentId')
  async deleteComment(
    @Param('id') taskId: string,
    @Param('commentId') commentId: string,
    @TenantId() tenantId: string,
  ): Promise<{ success: boolean }> {
    await this.tasksService.deleteComment(taskId, commentId, tenantId);
    return { success: true };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @TenantId() tenantId?: string,
  ): Promise<TaskResponseDto | null> {
    const task = await this.tasksService.findByIdInOrganization(id, tenantId!);
    if (!task) return null;
    return this.toResponse(task);
  }

  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @Patch(':id/assignee')
  async updateAssignee(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUserId() currentUserId: string,
    @Body() body: UpdateTaskAssigneeDto,
  ): Promise<TaskResponseDto | null> {
    const patch =
      body.assigneeIds !== undefined
        ? { assigneeIds: body.assigneeIds }
        : { assigneeId: body.assigneeId ?? null };
    const task = await this.tasksService.update(id, tenantId, patch, currentUserId);
    if (!task) return null;

    const notifyIds =
      body.assigneeIds !== undefined
        ? body.assigneeIds
        : body.assigneeId
          ? [body.assigneeId]
          : [];
    if (notifyIds.length > 0) {
      this.notifyAssignees(notifyIds, currentUserId, task.title, task.id, task.projectId).catch((err) =>
        this.logger.warn(`Failed to send assignment notifications: ${err}`),
      );
    }

    return this.toResponse(task);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() dto: PatchTaskDto,
  ): Promise<TaskResponseDto> {
    const task = await this.tasksService.update(id, tenantId, dto, userId);
    if (!task) {
      throw new NotFoundException('Task not found or not in this organization');
    }
    return this.toResponse(task);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
  ): Promise<{ success: boolean }> {
    await this.tasksService.delete(id, tenantId, userId);
    return { success: true };
  }

  private async notifyCommentObservers(
    task: import('./entities/task.entity').TaskEntity,
    commenterUserId: string,
    mentionedUserIds: string[] = [],
  ): Promise<void> {
    const [commenter, project] = await Promise.all([
      this.usersService.findById(commenterUserId),
      this.projectsService.findById(task.projectId),
    ]);
    const commenterName = commenter?.fullName || commenter?.email || 'Someone';
    const projectName = project?.name;
    const assigneeIds = task.assigneeIds ?? (task.assigneeId ? [task.assigneeId] : []);
    const toNotify = new Set<string>([
      ...assigneeIds,
      task.reporterId,
      ...mentionedUserIds,
    ].filter(Boolean));
    toNotify.delete(commenterUserId);
    for (const targetId of toNotify) {
      const isMention = mentionedUserIds.includes(targetId);
      const title = isMention
        ? `${commenterName} mentioned you in "${task.title}"`
        : `New comment on "${task.title}"`;
      const message = isMention
        ? `${commenterName} mentioned you in "${task.title}"${projectName ? ` in ${projectName}` : ''}.`
        : `${commenterName} commented on "${task.title}"${projectName ? ` in ${projectName}` : ''}.`;
      await this.notificationsService.createNotification(targetId, title, message);
    }
  }

  private async notifyAssignees(
    assigneeIds: string[],
    assignerUserId: string,
    taskTitle: string,
    taskId: string,
    projectId: string,
  ): Promise<void> {
    const [assigner, project] = await Promise.all([
      this.usersService.findById(assignerUserId),
      this.projectsService.findById(projectId),
    ]);
    const assignerName = assigner?.fullName || assigner?.email || 'Someone';
    const projectName = project?.name;
    const frontendUrl = getFrontendUrl();
    const taskUrl = `${frontendUrl}/dashboard/projects/${projectId}/board?task=${taskId}`;

    for (const assigneeId of assigneeIds) {
      if (assigneeId === assignerUserId) continue; // don't notify self
      const assignee = await this.usersService.findById(assigneeId);
      if (!assignee?.email) continue;

      const assigneeName = assignee.fullName || assignee.email;

      // In-app notification
      await this.notificationsService.createNotification(
        assigneeId,
        `Task assigned: ${taskTitle}`,
        `${assignerName} assigned you to "${taskTitle}"${projectName ? ` in ${projectName}` : ''}.`,
      ).catch((err) => this.logger.warn(`In-app notification failed: ${err}`));

      // Email notification
      await this.emailService.sendTaskAssignment({
        to: assignee.email,
        assigneeName,
        taskTitle,
        projectName,
        assignerName,
        taskUrl,
      }).catch((err) => this.logger.warn(`Task assignment email failed for ${assignee.email}: ${err}`));
    }
  }

  private toCommentResponse(c: TaskCommentEntity) {
    return {
      id: c.id,
      taskId: c.taskId,
      userId: c.userId,
      body: c.comment,
      createdAt: c.createdAt,
      updatedAt: c.createdAt,
      user: c.user
        ? {
            id: c.user.id,
            fullName: c.user.fullName,
            email: c.user.email,
            avatarUrl: c.user.avatarUrl ?? undefined,
          }
        : undefined,
    };
  }

  private toResponse(t: import('./entities/task.entity').TaskEntity): TaskResponseDto {
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
