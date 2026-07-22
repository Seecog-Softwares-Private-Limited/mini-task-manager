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

  /**
   * Notify when a planner template's series assignees or checklist assignees change.
   * Used when there is no pending occurrence task to carry the assignment.
   */
  scheduleTemplateAssignment(params: {
    actorUserId: string;
    projectId: string;
    templateId: string;
    title: string;
    beforeAssigneeIds?: string[] | null;
    afterAssigneeIds?: string[] | null;
    beforeSubtasks?: Array<{
      id?: string;
      title: string;
      assigneeId?: string;
      assigneeIds?: string[];
    }> | null;
    afterSubtasks?: Array<{
      id?: string;
      title: string;
      assigneeId?: string;
      assigneeIds?: string[];
    }> | null;
    linkTaskId?: string;
  }): void {
    this.runTemplateAssignment(params).catch((err) =>
      this.logger.error(
        `Planner assignment notification failed: ${err instanceof Error ? err.message : err}`,
        err instanceof Error ? err.stack : undefined,
      ),
    );
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

    const beforeSubtasks = this.coerceSubtasks(before?.subtasks);
    const afterSubtasks = this.coerceSubtasks(after.subtasks);
    if (afterSubtasks.length === 0) return;

    const beforeSubtaskIdKeys = new Set(
      beforeSubtasks
        .map((subtask) => normalizeUserIdForCompare(subtask.id))
        .filter((id): id is string => !!id),
    );
    const addedSubtasks = isCreate
      ? afterSubtasks
      : afterSubtasks.filter((subtask) => {
          const key = normalizeUserIdForCompare(subtask.id);
          return !key || !beforeSubtaskIdKeys.has(key);
        });

    for (let index = 0; index < afterSubtasks.length; index++) {
      const subtask = afterSubtasks[index];
      const previous = this.findPreviousSubtask(beforeSubtasks, subtask, index);
      const previousAssignees = previous ? this.getSubtaskAssigneeIds(previous) : [];
      const nextAssignees = this.getSubtaskAssigneeIds(subtask);
      // Always notify newly assigned subtask members (even if they also got
      // task_assigned in this same update) so every assignment sends a push.
      const newlyAssigned = this.getNewIds(previousAssignees, nextAssignees).filter(
        (assigneeId) => !this.isSameUser(assigneeId, actorUserId),
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

  private async runTemplateAssignment(params: {
    actorUserId: string;
    projectId: string;
    templateId: string;
    title: string;
    beforeAssigneeIds?: string[] | null;
    afterAssigneeIds?: string[] | null;
    beforeSubtasks?: Array<{
      id?: string;
      title: string;
      assigneeId?: string;
      assigneeIds?: string[];
    }> | null;
    afterSubtasks?: Array<{
      id?: string;
      title: string;
      assigneeId?: string;
      assigneeIds?: string[];
    }> | null;
    linkTaskId?: string;
  }): Promise<void> {
    const {
      actorUserId,
      projectId,
      templateId,
      title,
      linkTaskId,
    } = params;
    const beforeAssignees = this.normalizeIdList(params.beforeAssigneeIds);
    const afterAssignees = this.normalizeIdList(params.afterAssigneeIds);
    const newAssigneeIds = this.getNewIds(beforeAssignees, afterAssignees).filter(
      (id) => !this.isSameUser(id, actorUserId),
    );

    const assigner = await this.usersService.findById(actorUserId);
    const assignerName = assigner?.fullName || assigner?.email || 'Someone';
    const project = await this.projectsService.findById(projectId);
    const projectName = project?.name;
    const projectSuffix = projectName ? ` in ${projectName}` : '';
    const taskIdForLink = linkTaskId ? String(linkTaskId) : '';

    for (const assigneeId of newAssigneeIds) {
      try {
        await this.notificationsService.createNotification(
          assigneeId,
          `Task assigned: ${title}`,
          `${assignerName} assigned you to planner "${title}"${projectSuffix}.`,
          {
            type: 'task_assigned',
            taskId: taskIdForLink,
            projectId: String(projectId),
            templateId: String(templateId),
            open: 'alerts',
          },
        );
      } catch (err) {
        this.logger.warn(`Planner task assignment push failed: ${err}`);
      }
    }

    const beforeSubtasks = this.coerceSubtasks(params.beforeSubtasks);
    const afterSubtasks = this.coerceSubtasks(params.afterSubtasks);
    for (let index = 0; index < afterSubtasks.length; index++) {
      const subtask = afterSubtasks[index];
      const previous = this.findPreviousSubtask(beforeSubtasks, subtask, index);
      const previousAssignees = previous ? this.getSubtaskAssigneeIds(previous) : [];
      const nextAssignees = this.getSubtaskAssigneeIds(subtask);
      const newlyAssigned = this.getNewIds(previousAssignees, nextAssignees).filter(
        (id) => !this.isSameUser(id, actorUserId),
      );
      for (const assigneeId of newlyAssigned) {
        try {
          await this.notificationsService.createNotification(
            assigneeId,
            `Subtask assigned: ${subtask.title}`,
            `${assignerName} assigned you checklist item "${subtask.title}" on planner "${title}"${projectSuffix}.`,
            {
              type: 'subtask_assigned',
              taskId: taskIdForLink,
              projectId: String(projectId),
              templateId: String(templateId),
              subtaskId: String(subtask.id ?? ''),
              open: 'alerts',
            },
          );
        } catch (err) {
          this.logger.warn(`Planner checklist assignment push failed: ${err}`);
        }
      }
    }
  }

  private getTaskAssigneeIds(task: TaskEntity): string[] {
    return this.normalizeIdList(
      task.assigneeIds ?? (task.assigneeId ? [task.assigneeId] : []),
    );
  }

  private getSubtaskAssigneeIds(
    subtask: {
      assigneeId?: string;
      assigneeIds?: string[];
    },
  ): string[] {
    return this.normalizeIdList(
      subtask.assigneeIds?.length
        ? subtask.assigneeIds
        : subtask.assigneeId
          ? [subtask.assigneeId]
          : [],
    );
  }

  private normalizeIdList(raw?: Array<string | Buffer> | string[] | null): string[] {
    if (!raw?.length) return [];
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const id of raw) {
      const key = normalizeUserIdForCompare(id);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      ids.push(formatUuid(id) ?? String(id).trim());
    }
    return ids;
  }

  private coerceSubtasks(
    raw: unknown,
  ): Array<{
    id?: string;
    title: string;
    completed?: boolean;
    assigneeId?: string;
    assigneeIds?: string[];
  }> {
    if (!raw) return [];
    let value = raw;
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        return [];
      }
    }
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is {
        id?: string;
        title: string;
        completed?: boolean;
        assigneeId?: string;
        assigneeIds?: string[];
      } => !!item && typeof item === 'object' && typeof (item as { title?: unknown }).title === 'string',
    );
  }

  private findPreviousSubtask(
    beforeSubtasks: Array<{
      id?: string;
      title: string;
      assigneeId?: string;
      assigneeIds?: string[];
    }>,
    subtask: {
      id?: string;
      title: string;
    },
    index: number,
  ): {
    id?: string;
    title: string;
    assigneeId?: string;
    assigneeIds?: string[];
  } | undefined {
    const afterKey = normalizeUserIdForCompare(subtask.id);
    if (afterKey) {
      const byId = beforeSubtasks.find(
        (item) => normalizeUserIdForCompare(item.id) === afterKey,
      );
      if (byId) return byId;
    }

    const titleKey = subtask.title.trim().toLowerCase();
    if (!titleKey) return undefined;

    const sameIndex = beforeSubtasks[index];
    if (sameIndex && sameIndex.title.trim().toLowerCase() === titleKey) {
      return sameIndex;
    }

    return beforeSubtasks.find((item) => item.title.trim().toLowerCase() === titleKey);
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
    const notified: string[] = [];
    const markNotified = (id: string) => {
      if (!notified.some((item) => this.isSameUser(item, id))) {
        notified.push(id);
      }
    };

    let assignerName = 'Someone';
    let projectName: string | undefined;
    try {
      const [assigner, project] = await Promise.all([
        this.usersService.findById(assignerUserId),
        this.projectsService.findById(task.projectId),
      ]);
      assignerName = assigner?.fullName || assigner?.email || 'Someone';
      projectName = project?.name;
    } catch (err) {
      this.logger.warn(`Failed to resolve assigner/project for task push: ${err}`);
    }

    for (const assigneeId of notifyAssigneeIds) {
      if (this.isSameUser(assigneeId, assignerUserId)) continue;

      // Push/in-app first — must not depend on email/SMTP or attachment lookups.
      try {
        await this.notificationsService.createNotification(
          assigneeId,
          `Task assigned: ${task.title}`,
          `${assignerName} assigned you to "${task.title}"${projectName ? ` in ${projectName}` : ''}.`,
          {
            type: 'task_assigned',
            taskId: String(task.id),
            projectId: String(task.projectId),
            open: 'alerts',
          },
        );
        markNotified(assigneeId);
      } catch (err) {
        this.logger.warn(`In-app/push notification failed: ${err}`);
      }

      try {
        const context = await this.buildTaskEmailContext(task, assignerUserId);
        await this.sendTaskEmailToUser(assigneeId, context, {
          emailSubject: `Task assigned: ${task.title}`,
          headline: 'Task Assigned to You',
        });
      } catch (err) {
        this.logger.warn(`Task assignment email failed: ${err}`);
      }
    }

    return notified;
  }

  private async notifySubtaskAssignee(
    task: TaskEntity,
    subtask: {
      id?: string;
      title: string;
      dueDate?: string;
      assigneeId?: string;
      assigneeIds?: string[];
    },
    assignerUserId: string,
    assigneeId: string,
  ): Promise<string | null> {
    if (!assigneeId || this.isSameUser(assigneeId, assignerUserId)) return null;

    let assignerName = 'Someone';
    let projectName: string | undefined;
    try {
      const [assigner, project] = await Promise.all([
        this.usersService.findById(assignerUserId),
        this.projectsService.findById(task.projectId),
      ]);
      assignerName = assigner?.fullName || assigner?.email || 'Someone';
      projectName = project?.name;
    } catch (err) {
      this.logger.warn(`Failed to resolve assigner/project for subtask push: ${err}`);
    }

    // Push/in-app first — independent of email context / SMTP.
    try {
      await this.notificationsService.createNotification(
        assigneeId,
        `Subtask assigned: ${subtask.title}`,
        `${assignerName} assigned you subtask "${subtask.title}" on "${task.title}"${projectName ? ` in ${projectName}` : ''}.`,
        {
          type: 'subtask_assigned',
          taskId: String(task.id),
          projectId: String(task.projectId),
          subtaskId: String(subtask.id ?? ''),
          open: 'alerts',
        },
      );
    } catch (err) {
      this.logger.warn(`In-app/push notification failed: ${err}`);
    }

    try {
      const context = await this.buildTaskEmailContext(task, assignerUserId);
      const projectLine = context.projectName
        ? ` in <strong>${escapeHtml(context.projectName)}</strong>`
        : '';
      await this.sendTaskEmailToUser(assigneeId, context, {
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
    } catch (err) {
      this.logger.warn(`Subtask assignment email failed: ${err}`);
    }

    return assigneeId;
  }

  private async notifyTaskAssigneesAboutSubtasks(
    task: TaskEntity,
    assignerUserId: string,
    assigneeIds: string[],
    addedSubtasks: Array<{
      id?: string;
      title: string;
      completed?: boolean;
    }>,
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
          {
            type: 'subtasks_added',
            taskId: task.id,
            projectId: task.projectId,
            open: 'alerts',
          },
        )
        .catch((err) => this.logger.warn(`In-app/push notification failed: ${err}`));
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
