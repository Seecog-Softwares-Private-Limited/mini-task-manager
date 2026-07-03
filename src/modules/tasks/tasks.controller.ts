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
import { TaskAttachmentResponseDto } from './dto/task-attachment-response.dto';
import { TaskCommentEntity } from './entities/task-comment.entity';
import { TaskEntity } from './entities/task.entity';
import {
  formatAttachmentFileSize,
  formatTaskDueDateLabel,
  escapeHtml,
} from '../invitations/email-template.util';

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
    const assigneeIds = this.getTaskAssigneeIds(task);
    this.scheduleTaskNotifications({
      actorUserId: reporterId,
      after: task,
      newAssigneeIds: assigneeIds,
      isCreate: true,
    });

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

  @Get('attachments/:attachmentId/preview-rendered')
  @SkipThrottle({ default: true, auth: true })
  async getAttachmentRenderedPreview(
    @Param('attachmentId') attachmentId: string,
    @TenantId() tenantId: string,
  ) {
    return this.tasksService.getAttachmentRenderedPreview(attachmentId, tenantId);
  }

  @Get(':id/attachments')
  async getAttachments(
    @Param('id') taskId: string,
    @TenantId() tenantId: string,
  ): Promise<TaskAttachmentResponseDto[]> {
    const task = await this.tasksService.findByIdInOrganization(taskId, tenantId);
    if (!task) return [];
    const items = await this.tasksService.getAttachments(taskId);
    return items.map(TaskAttachmentResponseDto.fromEntity);
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
    const before = await this.tasksService.findByIdInOrganization(id, tenantId);
    if (!before) return null;

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
    const newAssigneeIds = this.getNewIds(this.getTaskAssigneeIds(before), notifyIds);
    if (newAssigneeIds.length > 0) {
      this.scheduleTaskNotifications({
        actorUserId: currentUserId,
        after: task,
        before,
        newAssigneeIds,
      });
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
    const before = await this.tasksService.findByIdInOrganization(id, tenantId);
    const task = await this.tasksService.update(id, tenantId, dto, userId);
    if (!task) {
      throw new NotFoundException('Task not found or not in this organization');
    }
    if (before) {
      this.scheduleTaskNotifications({
        actorUserId: userId,
        after: task,
        before,
      });
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

  private getTaskAssigneeIds(task: TaskEntity): string[] {
    return task.assigneeIds ?? (task.assigneeId ? [task.assigneeId] : []);
  }

  private getSubtaskAssigneeIds(
    subtask: NonNullable<TaskEntity['subtasks']>[number],
  ): string[] {
    return subtask.assigneeIds?.length
      ? subtask.assigneeIds
      : subtask.assigneeId
        ? [subtask.assigneeId]
        : [];
  }

  private getNewIds(before: string[], after: string[]): string[] {
    const seen = new Set(before);
    return after.filter((id) => id && !seen.has(id));
  }

  private scheduleTaskNotifications(params: {
    actorUserId: string;
    after: TaskEntity;
    before?: TaskEntity;
    newAssigneeIds?: string[];
    isCreate?: boolean;
  }): void {
    this.runTaskNotifications(params).catch((err) =>
      this.logger.error(
        `Task email notification failed: ${err instanceof Error ? err.message : err}`,
        err instanceof Error ? err.stack : undefined,
      ),
    );
  }

  private async runTaskNotifications(params: {
    actorUserId: string;
    after: TaskEntity;
    before?: TaskEntity;
    newAssigneeIds?: string[];
    isCreate?: boolean;
  }): Promise<void> {
    const { actorUserId, after, before, isCreate } = params;
    const beforeAssignees = before ? this.getTaskAssigneeIds(before) : [];
    const afterAssignees = this.getTaskAssigneeIds(after);
    const newAssigneeIds =
      params.newAssigneeIds ??
      (before ? this.getNewIds(beforeAssignees, afterAssignees) : afterAssignees);

    const notifiedUserIds = new Set<string>();

    if (newAssigneeIds.length > 0) {
      const sent = await this.notifyAssignees(after, actorUserId, newAssigneeIds);
      sent.forEach((id) => notifiedUserIds.add(id));
    }

    const beforeSubtasks = before?.subtasks ?? [];
    const afterSubtasks = after.subtasks ?? [];
    if (afterSubtasks.length === 0 && !isCreate) return;

    const beforeSubtaskIds = new Set(beforeSubtasks.map((subtask) => subtask.id));
    const addedSubtasks = isCreate
      ? afterSubtasks
      : afterSubtasks.filter((subtask) => !beforeSubtaskIds.has(subtask.id));

    for (const subtask of afterSubtasks) {
      const previous = beforeSubtasks.find((item) => item.id === subtask.id);
      const previousAssignees = previous ? this.getSubtaskAssigneeIds(previous) : [];
      const nextAssignees = this.getSubtaskAssigneeIds(subtask);
      const newlyAssigned = this.getNewIds(previousAssignees, nextAssignees).filter(
        (assigneeId) => assigneeId !== actorUserId && !notifiedUserIds.has(assigneeId),
      );

      for (const assigneeId of newlyAssigned) {
        const sent = await this.notifySubtaskAssignee(after, subtask, actorUserId, assigneeId);
        if (sent) notifiedUserIds.add(sent);
      }
    }

    const subtasksNeedingTaskAssigneeNotice = addedSubtasks.filter((subtask) => {
      const assigneeIds = this.getSubtaskAssigneeIds(subtask);
      return assigneeIds.length === 0 || assigneeIds.every((id) => !notifiedUserIds.has(id));
    });
    if (subtasksNeedingTaskAssigneeNotice.length > 0) {
      const taskAssigneeTargets = afterAssignees.filter(
        (id) => id !== actorUserId && !notifiedUserIds.has(id),
      );
      if (taskAssigneeTargets.length > 0) {
        await this.notifyTaskAssigneesAboutSubtasks(
          after,
          actorUserId,
          taskAssigneeTargets,
          subtasksNeedingTaskAssigneeNotice,
        );
      }
    }
  }

  private async notifyAssignees(
    task: TaskEntity,
    assignerUserId: string,
    notifyAssigneeIds: string[],
  ): Promise<string[]> {
    const context = await this.buildTaskEmailContext(task, assignerUserId);
    const notified: string[] = [];

    for (const assigneeId of notifyAssigneeIds) {
      if (assigneeId === assignerUserId) continue;
      const sent = await this.sendTaskEmailToUser(assigneeId, context, {
        emailSubject: `Task assigned: ${task.title}`,
        headline: 'Task Assigned to You',
      });
      if (sent) {
        notified.push(assigneeId);
        await this.notificationsService.createNotification(
          assigneeId,
          `Task assigned: ${task.title}`,
          `${context.assignerName} assigned you to "${task.title}"${context.projectName ? ` in ${context.projectName}` : ''}.`,
        ).catch((err) => this.logger.warn(`In-app notification failed: ${err}`));
      }
    }

    return notified;
  }

  private async notifySubtaskAssignee(
    task: TaskEntity,
    subtask: NonNullable<TaskEntity['subtasks']>[number],
    assignerUserId: string,
    assigneeId: string,
  ): Promise<string | null> {
    if (!assigneeId || assigneeId === assignerUserId) return null;

    const context = await this.buildTaskEmailContext(task, assignerUserId);
    const projectLine = context.projectName
      ? ` in <strong>${escapeHtml(context.projectName)}</strong>`
      : '';

    return this.sendTaskEmailToUser(assigneeId, context, {
      emailSubject: `Subtask assigned: ${subtask.title}`,
      headline: 'Subtask Assigned to You',
      introHtml: `<p style="text-align:center;color:#64748b;font-size:15px;line-height:1.6;margin:0 0 20px;">
  Hi <strong>{{assigneeName}}</strong>, <strong>${escapeHtml(context.assignerName)}</strong> assigned you a subtask${projectLine}.
</p>`,
      cardLabel: 'Subtask',
      highlightTitle: subtask.title,
      parentTaskTitle: task.title,
      dueDateLabel: subtask.dueDate
        ? formatTaskDueDateLabel(subtask.dueDate)
        : context.dueDateLabel,
    });
  }

  private async notifyTaskAssigneesAboutSubtasks(
    task: TaskEntity,
    assignerUserId: string,
    assigneeIds: string[],
    addedSubtasks: NonNullable<TaskEntity['subtasks']>,
  ): Promise<void> {
    const context = await this.buildTaskEmailContext(task, assignerUserId);
    const focusSubtasks = addedSubtasks.map((subtask) => ({
      title: subtask.title,
      completed: subtask.completed,
    }));
    const subtaskList = focusSubtasks.map((subtask) => escapeHtml(subtask.title)).join(', ');
    const projectLine = context.projectName
      ? ` in <strong>${escapeHtml(context.projectName)}</strong>`
      : '';

    for (const assigneeId of assigneeIds) {
      if (assigneeId === assignerUserId) continue;
      await this.sendTaskEmailToUser(assigneeId, context, {
        emailSubject: `Subtasks added to: ${task.title}`,
        headline: 'New Subtasks on Your Task',
        introHtml: `<p style="text-align:center;color:#64748b;font-size:15px;line-height:1.6;margin:0 0 20px;">
  Hi <strong>{{assigneeName}}</strong>, <strong>${escapeHtml(context.assignerName)}</strong> added subtasks to "${escapeHtml(task.title)}"${projectLine}: <strong>${subtaskList}</strong>.
</p>`,
        focusSubtasks,
      });
      await this.notificationsService.createNotification(
        assigneeId,
        `Subtasks added: ${task.title}`,
        `${context.assignerName} added ${addedSubtasks.length} subtask(s) to "${task.title}".`,
      ).catch((err) => this.logger.warn(`In-app notification failed: ${err}`));
    }
  }

  private async buildTaskEmailContext(task: TaskEntity, assignerUserId: string) {
    const [assigner, project, attachments] = await Promise.all([
      this.usersService.findById(assignerUserId),
      this.projectsService.findById(task.projectId),
      this.tasksService.getAttachments(task.id),
    ]);

    const assignerName = assigner?.fullName || assigner?.email || 'Someone';
    const assignerEmail = assigner?.email || 'unknown';
    const projectName = project?.name;
    const frontendUrl = getFrontendUrl();
    const taskUrl = `${frontendUrl}/dashboard/projects/${task.projectId}/board?task=${task.id}`;
    const dueDateLabel = formatTaskDueDateLabel(task.dueDate);
    const subtasks = (task.subtasks ?? []).map((subtask) => ({
      title: subtask.title,
      completed: subtask.completed,
    }));
    const attachmentItems = attachments.map((attachment) => ({
      fileName: attachment.fileName || 'Attachment',
      fileSize: formatAttachmentFileSize(
        attachment.fileSizeBytes == null ? null : Number(attachment.fileSizeBytes),
      ),
    }));

    const allAssigneeIds = this.getTaskAssigneeIds(task);
    const assigneeUsers = await Promise.all(
      Array.from(new Set(allAssigneeIds)).map((id) => this.usersService.findById(id)),
    );
    const allAssigneesLabel = assigneeUsers
      .filter((user) => user?.email)
      .map((user) => `${user!.fullName || user!.email} (${user!.email})`)
      .join(', ') || 'Unassigned';

    return {
      assignerName,
      assignerEmail,
      projectName,
      taskUrl,
      dueDateLabel,
      subtasks,
      attachmentItems,
      allAssigneesLabel,
      taskTitle: task.title,
      taskDescription: task.description,
    };
  }

  private async sendTaskEmailToUser(
    assigneeId: string,
    context: Awaited<ReturnType<TasksController['buildTaskEmailContext']>>,
    overrides: {
      emailSubject: string;
      headline: string;
      introHtml?: string;
      cardLabel?: string;
      highlightTitle?: string;
      parentTaskTitle?: string;
      focusSubtasks?: Array<{ title: string; completed?: boolean }>;
      dueDateLabel?: string;
    },
  ): Promise<string | null> {
    const assignee = await this.usersService.findById(assigneeId);
    if (!assignee?.email) {
      this.logger.warn(`Skipping task email — no email for user ${assigneeId}`);
      return null;
    }

    const assigneeName = assignee.fullName || assignee.email;
    const introHtml = overrides.introHtml?.replace(/\{\{assigneeName\}\}/g, assigneeName);

    try {
      await this.emailService.sendTaskAssignment({
        to: assignee.email,
        assigneeName,
        assigneeEmail: assignee.email,
        assignerName: context.assignerName,
        assignerEmail: context.assignerEmail,
        taskTitle: context.taskTitle,
        taskDescription: context.taskDescription,
        projectName: context.projectName,
        dueDateLabel: overrides.dueDateLabel ?? context.dueDateLabel,
        subtasks: context.subtasks,
        attachments: context.attachmentItems,
        allAssigneesLabel: context.allAssigneesLabel,
        taskUrl: context.taskUrl,
        emailSubject: overrides.emailSubject,
        headline: overrides.headline,
        introHtml,
        cardLabel: overrides.cardLabel,
        highlightTitle: overrides.highlightTitle,
        parentTaskTitle: overrides.parentTaskTitle,
        focusSubtasks: overrides.focusSubtasks,
      });
      this.logger.log(`Task email sent to ${assignee.email} (${overrides.emailSubject})`);
      return assigneeId;
    } catch (err) {
      this.logger.error(
        `Task assignment email failed for ${assignee.email}: ${err instanceof Error ? err.message : err}`,
        err instanceof Error ? err.stack : undefined,
      );
      return null;
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
