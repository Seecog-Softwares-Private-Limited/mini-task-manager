import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { EmailService } from '../invitations/email.service';
import { UsersService } from '../users/users.service';
import { ProjectsService } from '../projects/projects.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TasksService } from './tasks.service';
import { TaskEntity } from './entities/task.entity';
import { getFrontendUrl } from '../../common/utils/frontend-url.util';
import { formatUuid, normalizeUserIdForCompare } from '../../common/utils/uuid.util';
import {
  formatAttachmentFileSize,
  formatTaskDueDateLabel,
  escapeHtml,
} from '../invitations/email-template.util';

@Injectable()
export class TaskNotificationsService {
  private readonly logger = new Logger(TaskNotificationsService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
    private readonly projectsService: ProjectsService,
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => TasksService))
    private readonly tasksService: TasksService,
  ) {}

  scheduleOnCreate(task: TaskEntity, actorUserId: string): void {
    const assigneeIds = this.getTaskAssigneeIds(task);
    this.schedule({
      actorUserId,
      after: task,
      newAssigneeIds: assigneeIds,
      isCreate: true,
    });
  }

  scheduleOnUpdate(before: TaskEntity, after: TaskEntity, actorUserId: string): void {
    this.schedule({ actorUserId, before, after });
  }

  schedule(params: {
    actorUserId: string;
    after: TaskEntity;
    before?: TaskEntity;
    newAssigneeIds?: string[];
    isCreate?: boolean;
  }): void {
    this.run(params).catch((err) =>
      this.logger.error(
        `Task email notification failed: ${err instanceof Error ? err.message : err}`,
        err instanceof Error ? err.stack : undefined,
      ),
    );
  }

  private async run(params: {
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
      this.logger.log(
        `Task "${after.title}" — sending assignment emails to ${newAssigneeIds.length} assignee(s)`,
      );
      const sent = await this.notifyAssignees(after, actorUserId, newAssigneeIds);
      sent.forEach((id) => {
        const key = normalizeUserIdForCompare(id);
        if (key) notifiedUserIds.add(key);
      });
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
        (assigneeId) =>
          !this.isSameUser(assigneeId, actorUserId) &&
          !notifiedUserIds.has(normalizeUserIdForCompare(assigneeId) ?? ''),
      );

      for (const assigneeId of newlyAssigned) {
        const sent = await this.notifySubtaskAssignee(after, subtask, actorUserId, assigneeId);
        if (sent) {
          const key = normalizeUserIdForCompare(sent);
          if (key) notifiedUserIds.add(key);
        }
      }
    }

    const subtasksNeedingTaskAssigneeNotice = addedSubtasks.filter((subtask) => {
      const assigneeIds = this.getSubtaskAssigneeIds(subtask);
      return (
        assigneeIds.length === 0 ||
        assigneeIds.every((id) => !notifiedUserIds.has(normalizeUserIdForCompare(id) ?? ''))
      );
    });
    if (subtasksNeedingTaskAssigneeNotice.length > 0) {
      const taskAssigneeTargets = afterAssignees.filter(
        (id) =>
          !this.isSameUser(id, actorUserId) &&
          !notifiedUserIds.has(normalizeUserIdForCompare(id) ?? ''),
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

  private getTaskAssigneeIds(task: TaskEntity): string[] {
    const raw = task.assigneeIds ?? (task.assigneeId ? [task.assigneeId] : []);
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const id of raw) {
      const key = normalizeUserIdForCompare(String(id));
      if (!key || seen.has(key)) continue;
      seen.add(key);
      ids.push(formatUuid(id) ?? String(id).trim());
    }
    return ids;
  }

  private getSubtaskAssigneeIds(
    subtask: NonNullable<TaskEntity['subtasks']>[number],
  ): string[] {
    const raw = subtask.assigneeIds?.length
      ? subtask.assigneeIds
      : subtask.assigneeId
        ? [subtask.assigneeId]
        : [];
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const id of raw) {
      const key = normalizeUserIdForCompare(String(id));
      if (!key || seen.has(key)) continue;
      seen.add(key);
      ids.push(formatUuid(id) ?? String(id).trim());
    }
    return ids;
  }

  private getNewIds(before: string[], after: string[]): string[] {
    const seen = new Set(
      before
        .map((id) => normalizeUserIdForCompare(id))
        .filter((id): id is string => !!id),
    );
    return after.filter((id) => {
      const key = normalizeUserIdForCompare(id);
      return !!key && !seen.has(key);
    });
  }

  private isSameUser(a: string, b: string): boolean {
    const left = normalizeUserIdForCompare(a);
    const right = normalizeUserIdForCompare(b);
    return !!left && left === right;
  }

  private async notifyAssignees(
    task: TaskEntity,
    assignerUserId: string,
    notifyAssigneeIds: string[],
  ): Promise<string[]> {
    const context = await this.buildTaskEmailContext(task, assignerUserId);
    const notified: string[] = [];
    const markNotified = (id: string) => {
      if (!notified.some((item) => this.isSameUser(item, id))) {
        notified.push(id);
      }
    };

    for (const assigneeId of notifyAssigneeIds) {
      if (this.isSameUser(assigneeId, assignerUserId)) continue;
      const sent = await this.sendTaskEmailToUser(assigneeId, context, {
        emailSubject: `Task assigned: ${task.title}`,
        headline: 'Task Assigned to You',
      });
      if (sent) {
        markNotified(assigneeId);
      }
      // Push/in-app notification should not depend on SMTP success.
      await this.notificationsService
        .createNotification(
          assigneeId,
          `Task assigned: ${task.title}`,
          `${context.assignerName} assigned you to "${task.title}"${context.projectName ? ` in ${context.projectName}` : ''}.`,
        )
        .then(() => markNotified(assigneeId))
        .catch((err) => this.logger.warn(`In-app notification failed: ${err}`));
    }

    return notified;
  }

  private async notifySubtaskAssignee(
    task: TaskEntity,
    subtask: NonNullable<TaskEntity['subtasks']>[number],
    assignerUserId: string,
    assigneeId: string,
  ): Promise<string | null> {
    if (!assigneeId || this.isSameUser(assigneeId, assignerUserId)) return null;

    const context = await this.buildTaskEmailContext(task, assignerUserId);
    const projectLine = context.projectName
      ? ` in <strong>${escapeHtml(context.projectName)}</strong>`
      : '';

    const sent = await this.sendTaskEmailToUser(assigneeId, context, {
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

    // Push/in-app notification for subtask assignee (independent of email).
    await this.notificationsService
      .createNotification(
        assigneeId,
        `Subtask assigned: ${subtask.title}`,
        `${context.assignerName} assigned you subtask "${subtask.title}" on "${task.title}"${context.projectName ? ` in ${context.projectName}` : ''}.`,
      )
      .catch((err) => this.logger.warn(`In-app notification failed: ${err}`));

    return sent ?? assigneeId;
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
      if (this.isSameUser(assigneeId, assignerUserId)) continue;
      await this.sendTaskEmailToUser(assigneeId, context, {
        emailSubject: `Subtasks added to: ${task.title}`,
        headline: 'New Subtasks on Your Task',
        introHtml: `<p style="text-align:center;color:#64748b;font-size:15px;line-height:1.6;margin:0 0 20px;">
  Hi <strong>{{assigneeName}}</strong>, <strong>${escapeHtml(context.assignerName)}</strong> added subtasks to "${escapeHtml(task.title)}"${projectLine}: <strong>${subtaskList}</strong>.
</p>`,
        focusSubtasks,
      });
      await this.notificationsService
        .createNotification(
          assigneeId,
          `Subtasks added: ${task.title}`,
          `${context.assignerName} added ${addedSubtasks.length} subtask(s) to "${task.title}".`,
        )
        .catch((err) => this.logger.warn(`In-app notification failed: ${err}`));
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
    const allAssigneesLabel =
      assigneeUsers
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
    context: Awaited<ReturnType<TaskNotificationsService['buildTaskEmailContext']>>,
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
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.error(`Task assignment email failed for ${assignee.email}: ${detail}`);
      return null;
    }
  }
}
