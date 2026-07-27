import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TasksRepository } from './repositories/tasks.repository';
import { TaskCommentsRepository } from './repositories/task-comments.repository';
import { SubtaskCommentsRepository } from './repositories/subtask-comments.repository';
import { TaskAttachmentsRepository } from './repositories/task-attachments.repository';
import { SubtaskCommentEntity } from './entities/subtask-comment.entity';
import { ProjectsService } from '../projects/projects.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { UsageService } from '../billing/usage.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { PlanLimitService } from '../../plans/plan-limit.service';
import { TaskEntity } from './entities/task.entity';
import { TaskAttachmentEntity } from './entities/task-attachment.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { PatchTaskDto } from './dto/patch-task.dto';
import { RecurringTasksService } from './recurring-tasks.service';
import { OrgEventsService } from '../org-events/org-events.service';
import { TaskNotificationsService } from './task-notifications.service';
import { PaginationQueryDto, PaginatedResult, paginate } from '../../common/pagination';
import {
  formatUuid,
  generateUuid,
  normalizeUserIdForCompare,
} from '../../common/utils/uuid.util';
import { Configuration } from '../../config/configuration';
import {
  isOfficeDocumentPreviewable,
  renderOfficeDocumentPreview,
  type OfficePreviewResult,
} from '../../common/utils/office-document-preview.util';
import { findExistingUploadPath } from '../../common/utils/upload-path.util';
import { resolveAttachmentDisplayName } from '../../common/utils/attachment-display-name.util';
import * as fs from 'fs/promises';
import * as path from 'path';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
function normalizeMime(mimetype: string): string {
  return mimetype.split(';')[0]?.trim().toLowerCase() || '';
}

function isAllowedMime(mimetype: string, fileName?: string | null): boolean {
  const mime = normalizeMime(mimetype);
  if (mime) {
    if (
      mime.startsWith('image/') ||
      mime.startsWith('audio/') ||
      mime.startsWith('video/') ||
      mime.startsWith('text/') ||
      mime === 'application/pdf' ||
      mime === 'application/json' ||
      mime.startsWith('application/zip') ||
      mime === 'application/x-zip-compressed' ||
      mime === 'application/vnd.ms-excel' ||
      mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mime === 'application/vnd.ms-excel.sheet.macroenabled.12' ||
      mime === 'application/vnd.oasis.opendocument.spreadsheet' ||
      mime === 'application/msword' ||
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mime === 'text/csv'
    ) {
      return true;
    }
  }

  const ext = fileName?.split('.').pop()?.toLowerCase() ?? '';
  return [
    'png',
    'jpg',
    'jpeg',
    'gif',
    'webp',
    'bmp',
    'svg',
    'pdf',
    'txt',
    'csv',
    'json',
    'md',
    'm4a',
    'mp3',
    'aac',
    'wav',
    'ogg',
    'webm',
    'mp4',
    'mov',
  ].includes(ext);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'file';
}

/** Fields assignees may update on tasks assigned to them (owner/admin can update all). */
const ASSIGNEE_PATCH_FIELDS = new Set([
  'statusId',
  'priority',
  'subtasks',
  'title',
  'description',
]);

function normalizeAssigneeUserId(id: string | Buffer | null | undefined): string | null {
  const formatted = formatUuid(id as string | Buffer | null | undefined);
  if (!formatted) return null;
  return formatted.trim().toLowerCase().replace(/-/g, '');
}

function taskAssigneeUserIds(task: TaskEntity): string[] {
  const ids = new Set<string>();
  const add = (id: string | Buffer | null | undefined) => {
    const normalized = normalizeAssigneeUserId(id);
    if (normalized) ids.add(normalized);
  };
  for (const id of task.assigneeIds ?? []) add(id);
  add(task.assigneeId);
  return Array.from(ids);
}

function isTaskReporter(task: TaskEntity, userId: string): boolean {
  const normalizedUserId = normalizeAssigneeUserId(userId);
  if (!normalizedUserId) return false;
  return normalizedUserId === normalizeAssigneeUserId(task.reporterId);
}

function isRecurringTaskEntity(task: TaskEntity): boolean {
  if (task.recurringTemplateId) return true;
  const type = (task.recurrenceType ?? '').toUpperCase();
  return type.length > 0 && type !== 'NONE';
}

function patchDtoKeys(dto: PatchTaskDto): string[] {
  return (Object.keys(dto) as (keyof PatchTaskDto)[]).filter((k) => dto[k] !== undefined);
}

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly taskCommentsRepository: TaskCommentsRepository,
    private readonly subtaskCommentsRepository: SubtaskCommentsRepository,
    private readonly taskAttachmentsRepository: TaskAttachmentsRepository,
    private readonly projectsService: ProjectsService,
    @Inject(forwardRef(() => WorkflowsService))
    private readonly workflowsService: WorkflowsService,
    private readonly usageService: UsageService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly configService: ConfigService<Configuration>,
    private readonly organizationsService: OrganizationsService,
    @Inject(forwardRef(() => PlanLimitService))
    private readonly planLimitService: PlanLimitService,
    @Inject(forwardRef(() => RecurringTasksService))
    private readonly recurringTasksService: RecurringTasksService,
    @Inject(forwardRef(() => OrgEventsService))
    private readonly orgEventsService: OrgEventsService,
    @Inject(forwardRef(() => TaskNotificationsService))
    private readonly taskNotifications: TaskNotificationsService,
  ) {}

  async findById(id: string): Promise<TaskEntity | null> {
    return this.tasksRepository.findById(id);
  }

  async findByIdInOrganization(id: string, organizationId: string): Promise<TaskEntity | null> {
    return this.tasksRepository.findByIdAndOrganization(id, organizationId);
  }

  /** Remove a user from all task/subtask assignee lists in an organization. */
  async removeUserFromAssigneesInOrganization(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const target = normalizeAssigneeUserId(userId);
    if (!target) return;

    const tasks = await this.tasksRepository.findAssigneeFieldsByOrganization(organizationId);
    for (const task of tasks) {
      const currentIds = task.assigneeIds ?? (task.assigneeId ? [task.assigneeId] : []);
      const filteredIds = currentIds.filter((id) => normalizeAssigneeUserId(id) !== target);
      const hadAssignee =
        currentIds.some((id) => normalizeAssigneeUserId(id) === target) ||
        normalizeAssigneeUserId(task.assigneeId) === target;

      const subtasks = task.subtasks ?? [];
      let subtasksChanged = false;
      const nextSubtasks = subtasks.map((subtask) => {
        const subIds = subtask.assigneeIds?.length
          ? subtask.assigneeIds
          : subtask.assigneeId
            ? [subtask.assigneeId]
            : [];
        const filteredSub = subIds.filter((id) => normalizeAssigneeUserId(id) !== target);
        const subChanged =
          filteredSub.length !== subIds.length ||
          normalizeAssigneeUserId(subtask.assigneeId) === target;
        if (!subChanged) return subtask;
        subtasksChanged = true;
        const nextAssigneeIds = filteredSub.length ? filteredSub : undefined;
        return {
          ...subtask,
          assigneeIds: nextAssigneeIds,
          assigneeId: nextAssigneeIds?.[0],
        };
      });

      if (!hadAssignee && !subtasksChanged) continue;

      await this.tasksRepository.update(task.id, {
        assigneeIds: filteredIds.length ? filteredIds : null,
        assigneeId: filteredIds[0] ?? null,
        ...(subtasksChanged ? { subtasks: nextSubtasks } : {}),
      });
    }
  }

  /**
   * Workspace home dashboard: aggregates the same Total / Overdue style stats
   * users see on each project board (across active projects), plus due-today
   * and this week's completions. Planner/recurring runs stay out so numbers
   * match the Projects tab.
   */
  async getHomeDashboard(_userId: string, organizationId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(todayStart);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [tasks, projects] = await Promise.all([
      this.tasksRepository.findForHomeDashboard(organizationId, weekAgo),
      this.projectsService.findByOrganization(organizationId),
    ]);

    // Same population as project boards (active projects, no planner runs).
    // Assignee-only filtering made Home show 0 while Projects showed Total/Overdue.
    const scope = this.filterWorkspaceBoardTasks(tasks, projects);
    const dateOnly = TasksService.dateOnly;

    const isOverdueDue = (t: TaskEntity) => {
      const due = dateOnly(t.dueDate);
      return due != null && due < todayStart;
    };
    const isDueToday = (t: TaskEntity) => {
      const due = dateOnly(t.dueDate);
      return due != null && due.getTime() === todayStart.getTime();
    };

    // Match project boards: Total = all visible tasks; Overdue = past due date.
    const overdueTasks = scope
      .filter(isOverdueDue)
      .sort(
        (a, b) =>
          dateOnly(a.dueDate)!.getTime() - dateOnly(b.dueDate)!.getTime(),
      );
    const dueTodayTasks = scope.filter(
      (t) => isDueToday(t) && !t.completedAt,
    );
    const open = scope.filter((t) => !t.completedAt);
    const dueThisWeek = open.filter((t) => {
      const due = dateOnly(t.dueDate);
      return due != null && due >= todayStart && due < weekEnd;
    }).length;

    const completedRecently = scope.filter(
      (t) => t.completedAt && new Date(t.completedAt) >= weekAgo,
    );

    const trendMap = new Map<string, number>();
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(weekAgo);
      d.setDate(weekAgo.getDate() + i);
      trendMap.set(this.ymd(d), 0);
    }
    for (const t of completedRecently) {
      const key = this.ymd(new Date(t.completedAt as Date));
      if (trendMap.has(key)) trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
    }
    const weeklyTrend = Array.from(trendMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // Needs-attention list: incomplete overdue + due today (actionable).
    const attentionOverdue = overdueTasks.filter((t) => !t.completedAt);
    const attentionDueToday = dueTodayTasks;

    return {
      counts: {
        dueToday: dueTodayTasks.length,
        overdue: overdueTasks.length,
        dueThisWeek,
        completedThisWeek: completedRecently.length,
        openAssigned: open.length,
        total: scope.length,
      },
      weeklyTrend,
      overdueTasks: attentionOverdue.slice(0, 5),
      dueTodayTasks: attentionDueToday.slice(0, 5),
    };
  }

  private ymd(d: Date): string {
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  private static dateOnly(
    value: Date | string | null | undefined,
  ): Date | null {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /** Active-project, non-planner tasks — same population as project boards. */
  private filterWorkspaceBoardTasks(
    tasks: TaskEntity[],
    projects: Array<{ id: string; isArchived?: boolean }>,
  ): TaskEntity[] {
    const archived = new Set(
      projects
        .filter((p) => p.isArchived)
        .map((p) => normalizeAssigneeUserId(p.id))
        .filter((id): id is string => !!id),
    );
    return tasks.filter((t) => {
      if (isRecurringTaskEntity(t)) return false;
      const projId = normalizeAssigneeUserId(t.projectId);
      if (projId && archived.has(projId)) return false;
      return true;
    });
  }

  private filterMineExcludingArchived(
    tasks: TaskEntity[],
    projects: Array<{ id: string; isArchived?: boolean }>,
    userId: string,
  ): TaskEntity[] {
    const target = normalizeAssigneeUserId(userId);
    if (!target) return [];
    const archived = new Set(
      projects
        .filter((p) => p.isArchived)
        .map((p) => normalizeAssigneeUserId(p.id))
        .filter((id): id is string => !!id),
    );
    return tasks.filter((t) => {
      if (isRecurringTaskEntity(t)) return false;
      const projId = normalizeAssigneeUserId(t.projectId);
      if (projId && archived.has(projId)) return false;
      return taskAssigneeUserIds(t).includes(target);
    });
  }

  /**
   * Filterable, paginated "My Work" list across projects.
   */
  async getMyTasks(
    userId: string,
    organizationId: string,
    filter: 'overdue' | 'today' | 'week' | 'completed' | 'open' | 'all',
    page = 1,
    limit = 20,
  ): Promise<{
    data: TaskEntity[];
    meta: { page: number; limit: number; total: number; totalPages: number };
    counts: {
      overdue: number;
      today: number;
      week: number;
      completed: number;
      open: number;
      all: number;
    };
  }> {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safeLimit =
      Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 50) : 20;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const completedSince = new Date(todayStart);
    completedSince.setDate(completedSince.getDate() - 30);

    const [tasks, projects] = await Promise.all([
      this.tasksRepository.findForHomeDashboard(organizationId, completedSince),
      this.projectsService.findByOrganization(organizationId),
    ]);

    // Match Home/project boards: show workspace tasks, not only assignee matches.
    // (Many tasks have no assignee — assignee-only made Tasks look empty.)
    const mine = this.filterMineExcludingArchived(tasks, projects, userId);
    const workspace = this.filterWorkspaceBoardTasks(tasks, projects);
    const scope = mine.length > 0 ? mine : workspace;
    const dateOnly = TasksService.dateOnly;

    const open = scope.filter((t) => !t.completedAt);
    const isOverdue = (t: TaskEntity) => {
      const due = dateOnly(t.dueDate);
      return due != null && due < todayStart;
    };
    const isToday = (t: TaskEntity) => {
      const due = dateOnly(t.dueDate);
      return due != null && due.getTime() === todayStart.getTime();
    };
    const isWeek = (t: TaskEntity) => {
      const due = dateOnly(t.dueDate);
      return due != null && due >= todayStart && due < weekEnd;
    };
    const isCompleted = (t: TaskEntity) =>
      !!t.completedAt && new Date(t.completedAt) >= completedSince;

    const overdue = open.filter(isOverdue);
    // Overdue chip should match project-board overdue (past due), including
    // completed-with-past-due when nothing is assignee-scoped.
    const overdueAll = scope.filter(isOverdue);
    const today = open.filter(isToday);
    const week = open.filter(isWeek);
    const completed = scope.filter(isCompleted);

    const counts = {
      overdue: mine.length > 0 ? overdue.length : overdueAll.length,
      today: today.length,
      week: week.length,
      completed: completed.length,
      open: open.length,
      all: open.length + completed.length,
    };

    const byDueAsc = (a: TaskEntity, b: TaskEntity) => {
      const da = dateOnly(a.dueDate);
      const db = dateOnly(b.dueDate);
      if (da && db) return da.getTime() - db.getTime();
      if (da) return -1;
      if (db) return 1;
      return 0;
    };

    let selected: TaskEntity[];
    switch (filter) {
      case 'overdue':
        selected = (mine.length > 0 ? overdue : overdueAll).sort(byDueAsc);
        break;
      case 'today':
        selected = today.sort(byDueAsc);
        break;
      case 'week':
        selected = week.sort(byDueAsc);
        break;
      case 'completed':
        selected = completed.sort(
          (a, b) =>
            new Date(b.completedAt as Date).getTime() -
            new Date(a.completedAt as Date).getTime(),
        );
        break;
      case 'all':
        selected = [...open.sort(byDueAsc), ...completed];
        break;
      case 'open':
      default:
        selected = open.sort(byDueAsc);
        break;
    }

    const total = selected.length;
    const start = (safePage - 1) * safeLimit;
    const data = selected.slice(start, start + safeLimit);

    return {
      data,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      },
      counts,
    };
  }

  async findByProject(
    projectId: string,
    organizationId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<TaskEntity>> {
    const project = await this.projectsService.findByIdInOrganization(projectId, organizationId);
    if (!project) {
      return paginate([], 0, query?.page ?? 1, query?.limit ?? 20);
    }
    const [data, total] = await this.tasksRepository.findByProject(
      projectId,
      query?.page ?? 1,
      query?.limit ?? 20,
    );
    return paginate(data, total, query?.page ?? 1, query?.limit ?? 20);
  }

  async create(
    projectId: string,
    organizationId: string,
    reporterId: string,
    dto: CreateTaskDto,
  ): Promise<TaskEntity> {
    const assigneeIds = dto.assigneeIds?.length
      ? Array.from(new Set(dto.assigneeIds))
      : dto.assigneeId
        ? [dto.assigneeId]
        : [];

    const normalizedSubtasks = this.normalizeSubtasks(dto.subtasks, {
      currentUserId: reporterId,
    });
    const tags = this.normalizeTags(dto.tags);

    const statusId = await this.resolveInitialStatusId(
      projectId,
      organizationId,
      dto.statusId,
    );

    const dueDate = dto.dueDate ? String(dto.dueDate).slice(0, 10) : null;
    const dueTimeRaw = typeof dto.dueTime === 'string' ? dto.dueTime.trim() : '';
    const dueTime =
      dueDate && /^([01]\d|2[0-3]):[0-5]\d/.test(dueTimeRaw)
        ? dueTimeRaw.slice(0, 5)
        : null;

    const task = await this.tasksRepository.create({
      projectId,
      organizationId,
      reporterId,
      title: dto.title,
      description: dto.description ?? null,
      statusId,
      priority: dto.priority ?? 'MEDIUM',
      assigneeId: assigneeIds[0] ?? dto.assigneeId ?? null,
      assigneeIds: assigneeIds.length ? assigneeIds : null,
      dueDate: dueDate ? (dueDate as unknown as Date) : null,
      dueTime,
      storyPoints: dto.storyPoints ?? null,
      subtasks: normalizedSubtasks.length ? normalizedSubtasks : null,
      parentTaskId: dto.parentTaskId ?? null,
      sprintId: dto.sprintId ?? null,
      tags: tags.length ? tags : null,
      requireLocation: dto.requireLocation === true,
    });

    if (dto.recurrence && dto.recurrence.repeat && dto.recurrence.repeat !== 'NONE') {
      await this.recurringTasksService.attachRecurrenceToTask({
        taskId: task.id,
        organizationId,
        reporterId,
        projectId,
        title: dto.title,
        description: dto.description ?? null,
        statusId: statusId ?? null,
        priority: dto.priority ?? 'MEDIUM',
        assigneeId: assigneeIds[0] ?? dto.assigneeId ?? null,
        assigneeIds: assigneeIds.length ? assigneeIds : null,
        storyPoints: dto.storyPoints ?? null,
        subtasks: dto.subtasks,
        tags: tags.length ? tags : null,
        dueDate: dto.dueDate ? String(dto.dueDate).slice(0, 10) : null,
        dueTime: dueTime ?? null,
        recurrence: dto.recurrence,
      });
    }
    this.activityLogsService
      .log({ organizationId, userId: reporterId, entityType: 'task', entityId: task.id, action: 'create', metadata: { name: task.title } })
      .catch(() => {});
    this.orgEventsService
      .taskCreated({
        organizationId,
        projectId,
        taskId: task.id,
        title: task.title,
      })
      .catch(() => {});
    const finalTask = (await this.tasksRepository.findById(task.id)) ?? task;
    this.taskNotifications.scheduleOnCreate(finalTask, reporterId);
    return finalTask;
  }

  async update(
    taskId: string,
    organizationId: string,
    dto: PatchTaskDto,
    userId?: string,
  ): Promise<TaskEntity | null> {
    const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
    if (!task) return null;

    if (userId) {
      await this.assertCanUpdateTask(task, organizationId, userId, dto);
      if (dto.requireLocation !== undefined) {
        await this.assertCanSetTaskRequireLocation(task, organizationId, userId);
      }
    }

    let subtasksDto = dto.subtasks;
    if (userId && subtasksDto !== undefined) {
      subtasksDto = await this.lockUnauthorizedSubtaskRequireLocation(
        task,
        organizationId,
        userId,
        subtasksDto,
      );
    }

    const patch: Partial<TaskEntity> = {};
    if (dto.title !== undefined) {
      const trimmedTitle = dto.title.trim();
      if (trimmedTitle.length > 0) {
        patch.title = trimmedTitle;
      }
    }
    if (dto.description !== undefined) {
      const trimmedDescription = dto.description.trim();
      patch.description = trimmedDescription.length > 0 ? trimmedDescription : null;
    }
    if (dto.statusId !== undefined) patch.statusId = dto.statusId ?? null;
    if (dto.sprintId !== undefined) patch.sprintId = dto.sprintId ?? null;
    if (dto.assigneeIds !== undefined) {
      const ids = Array.from(new Set(dto.assigneeIds.filter((id) => !!String(id).trim())));
      patch.assigneeIds = ids.length ? ids : null;
      patch.assigneeId = ids[0] ?? null;
    } else if (dto.assigneeId !== undefined) {
      patch.assigneeId = dto.assigneeId ?? null;
      patch.assigneeIds = patch.assigneeId ? [patch.assigneeId] : null;
    }
    if (dto.dueDate !== undefined) {
      if (dto.dueDate === null || dto.dueDate === '') {
        patch.dueDate = null;
        patch.dueTime = null;
      } else {
        // MySQL `DATE`: use calendar YYYY-MM-DD string. JS `Date` from "YYYY-MM-DD" is UTC midnight and
        // can produce driver/sql errors or off-by-one days vs local date pickers.
        const ymd = String(dto.dueDate).slice(0, 10);
        patch.dueDate = ymd as unknown as Date;
      }
    }
    if (dto.dueTime !== undefined) {
      if (dto.dueTime === null || dto.dueTime === '') {
        patch.dueTime = null;
      } else if (patch.dueDate !== null || (patch.dueDate === undefined && task.dueDate)) {
        const raw = String(dto.dueTime).trim();
        patch.dueTime = /^([01]\d|2[0-3]):[0-5]\d/.test(raw) ? raw.slice(0, 5) : null;
      } else {
        patch.dueTime = null;
      }
    }
    if (dto.priority !== undefined) {
      patch.priority = dto.priority;
    }
    if (dto.storyPoints !== undefined) patch.storyPoints = dto.storyPoints ?? null;
    if (dto.tags !== undefined) {
      const normalized = this.normalizeTags(dto.tags);
      patch.tags = normalized.length ? normalized : null;
    }
    if (dto.requireLocation !== undefined) {
      patch.requireLocation = dto.requireLocation === true;
    }
    if (subtasksDto !== undefined) {
      const normalized = this.normalizeSubtasks(subtasksDto, {
        existing: task.subtasks,
        currentUserId: userId,
      });
      patch.subtasks = normalized.length ? normalized : null;
    }
    const nextStatusId = dto.statusId !== undefined ? dto.statusId ?? null : task.statusId;
    const statusChanged = dto.statusId !== undefined && nextStatusId !== task.statusId;
    if (statusChanged) {
      const movingToDone = await this.isDoneStatus(task.projectId, organizationId, nextStatusId);
      if (movingToDone) {
        const effectiveSubtasks = patch.subtasks ?? task.subtasks ?? [];
        const hasIncompleteSubtask = effectiveSubtasks.some((subtask) => {
          const status = String(subtask?.status ?? '').toUpperCase();
          if (status) return status !== 'DONE';
          return !Boolean(subtask?.completed);
        });
        if (hasIncompleteSubtask) {
          throw new BadRequestException(
            'Complete all subtasks before moving this task to Done',
          );
        }
        patch.completedAt = new Date();
      } else {
        const leavingDone = await this.isDoneStatus(task.projectId, organizationId, task.statusId);
        if (leavingDone) {
          patch.completedAt = null;
        }
      }
    }
    if (Object.keys(patch).length > 0) {
      await this.tasksRepository.update(taskId, patch);
      const action = dto.statusId !== undefined ? 'move' : 'update';
      this.activityLogsService
        .log({ organizationId, userId: userId ?? undefined, entityType: 'task', entityId: taskId, action, metadata: { name: task.title } })
        .catch(() => {});
      this.orgEventsService
        .taskUpdated({
          organizationId,
          projectId: task.projectId,
          taskId,
          title: task.title,
          changes: patch as Record<string, unknown>,
        })
        .catch(() => {});
    }

    if (dto.recurrence) {
      await this.recurringTasksService.updateRecurrenceFromTask(taskId, organizationId, dto.recurrence);
    }

    if (task.recurringTemplateId && subtasksDto !== undefined) {
      await this.recurringTasksService.syncTemplateChecklistFromTaskSubtasks(
        task.recurringTemplateId,
        organizationId,
        (patch.subtasks ?? []) as NonNullable<TaskEntity['subtasks']>,
      );
    }

    if (task.recurringTemplateId && statusChanged) {
      const done = await this.isDoneStatus(task.projectId, organizationId, nextStatusId);
      await this.recurringTasksService.syncOccurrenceCompletionFromTaskStatus(taskId, done);
    }
    const after = await this.tasksRepository.findById(taskId);
    if (after && userId) {
      this.taskNotifications.scheduleOnUpdate(task, after, userId);
    }
    return after;
  }

  private async isDoneStatus(
    projectId: string,
    organizationId: string,
    statusId: string | null | undefined,
  ): Promise<boolean> {
    if (!statusId) return false;
    const workflows = await this.workflowsService.findByProject(projectId, organizationId);
    for (const workflow of workflows) {
      const statuses = await this.workflowsService.getStatuses(workflow.id);
      const status = statuses.find((s: { id: string; type?: string }) => s.id === statusId);
      if (status) return (status.type ?? '').toUpperCase() === 'DONE';
    }
    return false;
  }

  async delete(taskId: string, organizationId: string, userId?: string): Promise<void> {
    const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
    if (!task) throw new NotFoundException('Task not found');

    if (userId) {
      await this.assertCanDeleteTask(task, organizationId, userId);
    }

    const attachments = await this.taskAttachmentsRepository.findByTask(taskId);
    const uploadsPath = this.configService.get('uploadsPath', { infer: true })!;
    for (const attachment of attachments) {
      const fullPath = path.join(uploadsPath, attachment.fileUrl);
      await fs.unlink(fullPath).catch(() => {});
    }

    await this.tasksRepository.clearParentReferences(taskId);
    await this.tasksRepository.delete(taskId);

    this.activityLogsService
      .log({
        organizationId,
        userId,
        entityType: 'task',
        entityId: taskId,
        action: 'delete',
        metadata: { name: task.title },
      })
      .catch(() => {});
  }

  private async assertCanDeleteTask(
    task: TaskEntity,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.organizationsService.getMembership(organizationId, userId);
    const role = membership?.role?.toLowerCase() ?? '';
    if (role === 'owner') return;

    if (isTaskReporter(task, userId)) return;

    throw new ForbiddenException('Only the workspace owner or task creator can delete this task');
  }

  private async assertCanUpdateTask(
    task: TaskEntity,
    organizationId: string,
    userId: string,
    dto: PatchTaskDto,
  ): Promise<void> {
    const membership = await this.organizationsService.getMembership(organizationId, userId);
    const role = membership?.role?.toLowerCase() ?? '';
    // Workspace owner or admin can fully update any task fields.
    if (role === 'owner' || role === 'admin') return;

    const assigneeIds = taskAssigneeUserIds(task);
    const normalizedUserId = normalizeAssigneeUserId(userId);
    const isAssignee = normalizedUserId != null && assigneeIds.includes(normalizedUserId);
    const isReporter = isTaskReporter(task, userId);

    // Assigned-by (reporter) or assignee can update; assignees are limited to allowed fields below.
    if (isReporter) return;

    if (!isAssignee) {
      throw new ForbiddenException(
        'Only the workspace owner, task assignee, or task creator can update this task',
      );
    }

    const keys = patchDtoKeys(dto);
    const disallowed = keys.filter((k) => !ASSIGNEE_PATCH_FIELDS.has(k));
    if (disallowed.length > 0) {
      throw new ForbiddenException(
        'Assignees can only update task title, description, status, priority, and subtasks',
      );
    }
  }

  /** Owner/admin or task creator may set task-level requireLocation. */
  private async assertCanSetTaskRequireLocation(
    task: TaskEntity,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.organizationsService.getMembership(organizationId, userId);
    const role = membership?.role?.toLowerCase() ?? '';
    if (role === 'owner' || role === 'admin') return;
    if (isTaskReporter(task, userId)) return;
    throw new ForbiddenException(
      'Only the workspace owner or task creator can change require location',
    );
  }

  /**
   * Assignees may update subtasks, but cannot change requireLocation on items
   * they did not create (owner/admin and task creator may change any).
   */
  private async lockUnauthorizedSubtaskRequireLocation(
    task: TaskEntity,
    organizationId: string,
    userId: string,
    incoming: NonNullable<PatchTaskDto['subtasks']>,
  ): Promise<NonNullable<PatchTaskDto['subtasks']>> {
    const membership = await this.organizationsService.getMembership(organizationId, userId);
    const role = membership?.role?.toLowerCase() ?? '';
    if (role === 'owner' || role === 'admin' || isTaskReporter(task, userId)) {
      return incoming;
    }

    const existingById = new Map(
      (task.subtasks ?? [])
        .filter((s) => !!s?.id)
        .map((s) => [String(s.id), s] as const),
    );
    const normalizedUser = normalizeAssigneeUserId(userId);

    return incoming.map((s) => {
      const prior = s.id ? existingById.get(String(s.id)) : undefined;
      // New checklist items are created by the current user — they may set location.
      if (!prior) return s;
      const subReporter = normalizeAssigneeUserId(prior.reporterId ?? s.reporterId);
      const canSet = normalizedUser != null && subReporter != null && normalizedUser === subReporter;
      if (canSet) return s;
      const priorValue = prior.requireLocation === true;
      return { ...s, requireLocation: priorValue };
    });
  }

  private normalizeTags(
    tags?: Array<{ name: string; color: string }>,
  ): Array<{ name: string; color: string }> {
    if (!tags?.length) return [];
    const seen = new Set<string>();
    return tags
      .filter((t) => t?.name != null && String(t.name).trim().length > 0)
      .map((t) => ({
        name: String(t.name).trim().slice(0, 80),
        color: String(t.color ?? '#6B7280').trim().slice(0, 20),
      }))
      .filter((t) => {
        const key = t.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  private normalizeSubtaskStatus(subtask: {
    status?: string;
    completed?: boolean;
  }): 'TODO' | 'IN_PROGRESS' | 'DONE' {
    const raw = typeof subtask.status === 'string' ? subtask.status.toUpperCase() : '';
    if (raw === 'TODO' || raw === 'IN_PROGRESS' || raw === 'DONE') {
      return raw;
    }
    if (subtask.completed) return 'DONE';
    return 'TODO';
  }

  private normalizeSubtaskAssignees(subtask: {
    assigneeId?: string;
    assigneeIds?: string[];
  }): { assigneeId?: string; assigneeIds?: string[] } {
    const ids = subtask.assigneeIds?.length
      ? Array.from(new Set(subtask.assigneeIds.map((id) => String(id).trim()).filter(Boolean)))
      : subtask.assigneeId
        ? [String(subtask.assigneeId).trim()]
        : [];
    if (!ids.length) return {};
    return { assigneeIds: ids, assigneeId: ids[0] };
  }

  private normalizeSubtasks(
    subtasks?: Array<{
      id?: string;
      title: string;
      completed?: boolean;
      description?: string;
      assigneeId?: string;
      assigneeIds?: string[];
      dueDate?: string;
      dueTime?: string;
      priority?: string;
      status?: string;
      statusId?: string;
      completionRecord?: Record<string, any>;
      reporterId?: string;
      createdAt?: string;
      note?: string;
      requireLocation?: boolean;
    }>,
    context?: {
      existing?: Array<{ id?: string; reporterId?: string; createdAt?: string }> | null;
      currentUserId?: string;
    },
  ): Array<{
    id: string;
    title: string;
    completed: boolean;
    description?: string;
    assigneeId?: string;
    assigneeIds?: string[];
    dueDate?: string;
    dueTime?: string;
    status: 'TODO' | 'IN_PROGRESS' | 'DONE';
    priority?: string;
    statusId?: string;
    completionRecord?: Record<string, any>;
    reporterId?: string;
    createdAt?: string;
    note?: string;
    requireLocation?: boolean;
  }> {
    if (!subtasks?.length) return [];
    const existingById = new Map(
      (context?.existing ?? [])
        .filter((s) => !!s?.id)
        .map((s) => [String(s.id), s] as const),
    );
    const nowIso = new Date().toISOString();
    return subtasks
      .map((s) => {
        const description = s.description?.trim();
        const status = this.normalizeSubtaskStatus(s);
        const assignees = this.normalizeSubtaskAssignees(s);
        const prior = s.id ? existingById.get(String(s.id)) : undefined;
        // Reporter/createdAt are set once (on creation) and preserved thereafter,
        // so clients that omit them on save do not wipe the audit trail.
        const reporterId =
          prior?.reporterId ?? s.reporterId ?? context?.currentUserId ?? undefined;
        const createdAt = prior?.createdAt ?? s.createdAt ?? nowIso;
        const dueDate = s.dueDate ? String(s.dueDate).slice(0, 10) : undefined;
        const dueTimeRaw = typeof s.dueTime === 'string' ? s.dueTime.trim() : '';
        // Keep HH:mm even when dueDate is absent (checklist items may set time only).
        const dueTime = /^([01]\d|2[0-3]):[0-5]\d/.test(dueTimeRaw)
          ? dueTimeRaw.slice(0, 5)
          : undefined;
        return {
          id: s.id ?? generateUuid(),
          title: s.title?.trim() ?? '',
          completed: status === 'DONE',
          status,
          ...(description ? { description } : {}),
          ...assignees,
          ...(dueDate ? { dueDate } : {}),
          ...(dueTime ? { dueTime } : {}),
          ...(s.priority ? { priority: s.priority } : {}),
          ...(s.statusId ? { statusId: s.statusId } : {}),
          ...(s.completionRecord && typeof s.completionRecord === 'object'
            ? { completionRecord: s.completionRecord }
            : {}),
          ...(reporterId ? { reporterId } : {}),
          createdAt,
          ...(typeof s.note === 'string' && s.note.trim().length
            ? { note: s.note.trim().slice(0, 2000) }
            : {}),
          ...(s.requireLocation === true ? { requireLocation: true } : {}),
        };
      })
      .filter((s) => s.title.length > 0);
  }

  async getComments(taskId: string) {
    return this.taskCommentsRepository.findByTask(taskId);
  }

  async addComment(
    taskId: string,
    organizationId: string,
    userId: string,
    body: string,
  ) {
    const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
    if (!task) throw new NotFoundException('Task not found');
    const trimmed = body.trim();
    if (!trimmed.length) throw new BadRequestException('Comment cannot be empty');
    const comment = await this.taskCommentsRepository.create({
      taskId,
      userId,
      comment: trimmed,
    });
    return this.taskCommentsRepository.findById(comment.id);
  }

  async deleteComment(
    taskId: string,
    commentId: string,
    organizationId: string,
  ): Promise<void> {
    const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
    if (!task) throw new NotFoundException('Task not found');
    const comment = await this.taskCommentsRepository.findById(commentId);
    if (!comment || comment.taskId !== taskId) throw new NotFoundException('Comment not found');
    await this.taskCommentsRepository.delete(commentId);
  }

  /**
   * Checklist-item note thread (Planner). Nested replies allowed (reply-to-reply).
   * Deleting a note cascade-deletes descendants via FK.
   */
  async getSubtaskComments(
    taskId: string,
    subtaskId: string,
    organizationId: string,
    actorUserId: string,
  ): Promise<Array<SubtaskCommentEntity & { replies: SubtaskCommentEntity[] }>> {
    const task = await this.assertTaskSubtask(taskId, subtaskId, organizationId);
    const scopedSubtaskId = subtaskId.trim();
    await this.ensureLegacySubtaskNoteSeeded(task, scopedSubtaskId, actorUserId);

    const all = await this.subtaskCommentsRepository.findAllBySubtask(
      taskId,
      scopedSubtaskId,
    );
    const byParent = new Map<string, SubtaskCommentEntity[]>();
    for (const comment of all) {
      if (!comment.parentId) continue;
      const list = byParent.get(comment.parentId) ?? [];
      list.push(comment);
      byParent.set(comment.parentId, list);
    }

    const nest = (
      node: SubtaskCommentEntity,
    ): SubtaskCommentEntity & { replies: SubtaskCommentEntity[] } => {
      // Replies stay oldest → newest so the conversation reads top to bottom.
      const children = (byParent.get(node.id) ?? []).map(nest);
      return Object.assign(node, { replies: children });
    };

    // Root threads: newest first.
    return all
      .filter((c) => !c.parentId)
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(nest);
  }

  async addSubtaskComment(
    taskId: string,
    subtaskId: string,
    organizationId: string,
    userId: string,
    body: string,
    parentId?: string | null,
  ): Promise<SubtaskCommentEntity> {
    const task = await this.assertTaskSubtask(taskId, subtaskId, organizationId);
    await this.assertCanCommentOnSubtaskNote(task, subtaskId, organizationId, userId);
    const trimmed = body.trim().slice(0, 2000);
    if (!trimmed.length) throw new BadRequestException('Comment cannot be empty');

    let resolvedParentId: string | null = null;
    if (parentId) {
      const parent = await this.subtaskCommentsRepository.findById(parentId);
      if (
        !parent ||
        parent.taskId !== taskId ||
        parent.subtaskId !== subtaskId ||
        parent.organizationId !== organizationId
      ) {
        throw new NotFoundException('Parent note not found');
      }
      const depth = await this.getCommentDepth(parent);
      // Root = 0; allow up to depth 7 so a reply sits at depth 8 max.
      if (depth >= 7) {
        throw new BadRequestException('Reply nesting limit reached');
      }
      resolvedParentId = parent.id;
    }

    const created = await this.subtaskCommentsRepository.create({
      organizationId,
      taskId,
      subtaskId,
      userId,
      body: trimmed,
      parentId: resolvedParentId,
    });

    if (!resolvedParentId) {
      await this.syncSubtaskNotePreview(taskId, organizationId, subtaskId);
    }

    const reloaded = await this.subtaskCommentsRepository.findById(created.id);
    if (!reloaded) throw new NotFoundException('Comment not found');
    return reloaded;
  }

  async updateSubtaskComment(
    taskId: string,
    subtaskId: string,
    commentId: string,
    organizationId: string,
    userId: string,
    body: string,
  ): Promise<SubtaskCommentEntity> {
    await this.assertTaskSubtask(taskId, subtaskId, organizationId);
    const comment = await this.subtaskCommentsRepository.findById(commentId);
    if (
      !comment ||
      comment.taskId !== taskId ||
      comment.subtaskId !== subtaskId ||
      comment.organizationId !== organizationId
    ) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own notes');
    }
    const trimmed = body.trim().slice(0, 2000);
    if (!trimmed.length) throw new BadRequestException('Comment cannot be empty');
    await this.subtaskCommentsRepository.updateBody(commentId, trimmed);
    if (!comment.parentId) {
      await this.syncSubtaskNotePreview(taskId, organizationId, subtaskId);
    }
    const reloaded = await this.subtaskCommentsRepository.findById(commentId);
    if (!reloaded) throw new NotFoundException('Comment not found');
    return reloaded;
  }

  async deleteSubtaskComment(
    taskId: string,
    subtaskId: string,
    commentId: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    await this.assertTaskSubtask(taskId, subtaskId, organizationId);
    const comment = await this.subtaskCommentsRepository.findById(commentId);
    if (
      !comment ||
      comment.taskId !== taskId ||
      comment.subtaskId !== subtaskId ||
      comment.organizationId !== organizationId
    ) {
      throw new NotFoundException('Comment not found');
    }

    const isAuthor = comment.userId === userId;
    if (!isAuthor) {
      const role = (await this.organizationsService.getMemberRole(organizationId, userId))
        ?.toLowerCase();
      if (role !== 'owner' && role !== 'admin') {
        throw new ForbiddenException('Only the author, an admin, or the owner can delete this note');
      }
    }

    // Cascade descendants via FK ON DELETE CASCADE.
    await this.subtaskCommentsRepository.delete(commentId);
    if (!comment.parentId) {
      await this.syncSubtaskNotePreview(taskId, organizationId, subtaskId);
    }
  }

  /** Depth of a note in its thread (root = 0). */
  private async getCommentDepth(comment: SubtaskCommentEntity): Promise<number> {
    let depth = 0;
    let current: SubtaskCommentEntity | null = comment;
    const seen = new Set<string>();
    while (current?.parentId) {
      if (seen.has(current.id)) break;
      seen.add(current.id);
      depth += 1;
      current = await this.subtaskCommentsRepository.findById(current.parentId);
      if (depth > 20) break;
    }
    return depth;
  }

  private async assertTaskSubtask(
    taskId: string,
    subtaskId: string,
    organizationId: string,
  ): Promise<TaskEntity> {
    const trimmedSubtaskId = subtaskId?.trim();
    if (!trimmedSubtaskId) {
      throw new BadRequestException('Checklist item id is required');
    }
    const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
    if (!task) throw new NotFoundException('Task not found');
    const found = task.subtasks?.some((s) => s.id === trimmedSubtaskId);
    if (!found) throw new NotFoundException('Checklist item not found');
    return task;
  }

  /**
   * Planner note ACL:
   * - owner / admin → comment or reply on any checklist note
   * - member → only on checklist items where they are assigned
   */
  private async assertCanCommentOnSubtaskNote(
    task: TaskEntity,
    subtaskId: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const role = (await this.organizationsService.getMemberRole(organizationId, userId))
      ?.toLowerCase();
    if (role === 'owner' || role === 'admin') return;

    const sub = task.subtasks?.find((s) => s.id === subtaskId);
    if (!sub) throw new NotFoundException('Checklist item not found');

    const assigneeIds = [
      ...(sub.assigneeIds?.length
        ? sub.assigneeIds
        : sub.assigneeId
          ? [sub.assigneeId]
          : []),
    ];
    const actorKey = normalizeUserIdForCompare(userId);
    const isAssigned = assigneeIds.some(
      (id) => normalizeUserIdForCompare(id) === actorKey,
    );
    if (!isAssigned) {
      throw new ForbiddenException(
        'Only owners and admins can comment on any note. Members can comment only on checklist notes they are assigned to.',
      );
    }
  }

  /**
   * One-time: if JSON subtask.note is set and the thread is empty, seed a root note.
   * Author: task reporter (fallback: actor).
   */
  private async ensureLegacySubtaskNoteSeeded(
    task: TaskEntity,
    subtaskId: string,
    actorUserId: string,
  ): Promise<void> {
    const sub = task.subtasks?.find((s) => s.id === subtaskId);
    const legacy = sub?.note?.trim();
    if (!legacy) return;

    const count = await this.subtaskCommentsRepository.countRootsBySubtask(task.id, subtaskId);
    if (count > 0) return;

    const authorId = task.reporterId || actorUserId;
    await this.subtaskCommentsRepository.create({
      organizationId: task.organizationId,
      taskId: task.id,
      subtaskId,
      userId: authorId,
      body: legacy.slice(0, 2000),
      parentId: null,
    });
  }

  /** Keep tasks.subtasks[].note as a denormalized preview for Planner badges. */
  private async syncSubtaskNotePreview(
    taskId: string,
    organizationId: string,
    subtaskId: string,
  ): Promise<void> {
    const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
    if (!task?.subtasks?.length) return;

    const roots = await this.subtaskCommentsRepository.findRootsBySubtask(taskId, subtaskId);
    // Roots are newest-first.
    const latest = roots.length ? roots[0] : null;
    const preview = latest?.body?.trim().slice(0, 2000) || undefined;

    const next = task.subtasks.map((s) => {
      if (s.id !== subtaskId) return s;
      const copy = { ...s };
      if (preview) copy.note = preview;
      else delete copy.note;
      return copy;
    });
    await this.tasksRepository.update(taskId, { subtasks: next });
  }

  async getAttachments(taskId: string): Promise<TaskAttachmentEntity[]> {
    return this.taskAttachmentsRepository.findByTask(taskId);
  }

  async addAttachment(
    taskId: string,
    organizationId: string,
    userId: string,
    file: { originalname?: string; mimetype?: string; size: number; buffer: Buffer },
  ): Promise<TaskAttachmentEntity> {
    const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
    if (!task) throw new NotFoundException('Task not found');
    if (file.size > MAX_FILE_SIZE) throw new ForbiddenException('File too large (max 10MB)');
    if (!isAllowedMime(file.mimetype || '', file.originalname)) {
      throw new ForbiddenException('File type not allowed');
    }

    await this.planLimitService.assertStorageLimit(userId, file.size);

    const storageMbIncrement = Math.ceil(file.size / (1024 * 1024));
    const limitCheck = await this.usageService.checkLimit(organizationId, 'storageGb', storageMbIncrement);
    if (!limitCheck.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          error: 'LIMIT_EXCEEDED',
          code: 'SUBSCRIPTION_LIMIT_EXCEEDED',
          resource: limitCheck.resource,
          current: limitCheck.current,
          limit: limitCheck.limit,
          message: limitCheck.message,
          upgradeUrl: '/dashboard/billing',
        },
        HttpStatus.FORBIDDEN,
      );
    }
    const uploadsPath = this.configService.get('uploadsPath', { infer: true })!;
    const dir = path.join(uploadsPath, 'task-attachments', taskId);
    await fs.mkdir(dir, { recursive: true });
    const ext = path.extname(file.originalname || '') || '';
    const base = sanitizeFileName(path.basename(file.originalname || 'file', ext));
    const relativePath = path.join('task-attachments', taskId, `${generateUuid()}-${base}${ext}`);
    const fullPath = path.join(uploadsPath, relativePath);
    await fs.writeFile(fullPath, file.buffer);
    const displayName = resolveAttachmentDisplayName(file.originalname, file.mimetype);
    const attachment = await this.taskAttachmentsRepository.create({
      taskId,
      fileUrl: relativePath.replace(/\\/g, '/'),
      fileName: displayName,
      fileSizeBytes: file.size,
      uploadedBy: userId,
    });
    await this.planLimitService.incrementStorageUsed(userId, file.size);
    return attachment;
  }

  async getAttachmentFile(attachmentId: string, organizationId: string): Promise<{ path: string; fileName: string | null }> {
    const normalizedId = formatUuid(attachmentId.trim()) ?? attachmentId.trim();
    const attachment = await this.taskAttachmentsRepository.findById(normalizedId);
    if (!attachment) throw new NotFoundException('Attachment not found');
    const task = await this.tasksRepository.findByIdAndOrganization(attachment.taskId, organizationId);
    if (!task) throw new NotFoundException('Task not found');
    const uploadsPath = this.configService.get('uploadsPath', { infer: true })!;
    const fullPath = await findExistingUploadPath(uploadsPath, attachment.fileUrl);
    return { path: fullPath, fileName: attachment.fileName };
  }

  async getAttachmentRenderedPreview(
    attachmentId: string,
    organizationId: string,
  ): Promise<OfficePreviewResult> {
    const attachment = await this.taskAttachmentsRepository.findById(
      formatUuid(attachmentId.trim()) ?? attachmentId.trim(),
    );
    if (!attachment) throw new NotFoundException('Attachment not found');
    const task = await this.tasksRepository.findByIdAndOrganization(attachment.taskId, organizationId);
    if (!task) throw new NotFoundException('Task not found');
    if (!isOfficeDocumentPreviewable(null, attachment.fileName)) {
      throw new BadRequestException('Preview is not available for this file type.');
    }
    const uploadsPath = this.configService.get('uploadsPath', { infer: true })!;
    const fullPath = await findExistingUploadPath(uploadsPath, attachment.fileUrl);
    let buffer: Buffer;
    try {
      buffer = await fs.readFile(fullPath);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === 'ENOENT') {
        throw new NotFoundException('Attachment file not found');
      }
      throw new BadRequestException('Could not read this document. Try downloading the file instead.');
    }
    const rendered = await renderOfficeDocumentPreview(
      buffer,
      attachment.fileName,
      null,
      null,
      attachment.fileName,
    );
    if (!rendered) {
      throw new BadRequestException('Could not read this document. Try downloading the file instead.');
    }
    return rendered;
  }

  async deleteAttachment(
    taskId: string,
    attachmentId: string,
    organizationId: string,
  ): Promise<void> {
    const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
    if (!task) throw new NotFoundException('Task not found');
    const attachment = await this.taskAttachmentsRepository.findById(
      formatUuid(attachmentId.trim()) ?? attachmentId.trim(),
    );
    if (!attachment || attachment.taskId !== taskId) throw new NotFoundException('Attachment not found');
    const uploadsPath = this.configService.get('uploadsPath', { infer: true })!;
    try {
      const fullPath = await findExistingUploadPath(uploadsPath, attachment.fileUrl);
      await fs.unlink(fullPath).catch(() => {});
    } catch {
      /* file already removed from disk */
    }
    await this.taskAttachmentsRepository.delete(attachmentId);
    if (attachment.fileSizeBytes && attachment.uploadedBy) {
      await this.planLimitService.decrementStorageUsed(
        attachment.uploadedBy,
        Number(attachment.fileSizeBytes),
      );
    }
  }

  /** Pick a valid board column for new tasks (requested status, else first To Do). */
  private async resolveInitialStatusId(
    projectId: string,
    organizationId: string,
    requestedStatusId?: string,
  ): Promise<string | null> {
    const workflows = await this.workflowsService.findByProject(projectId, organizationId);
    const defaultWorkflow = workflows.find((w) => w.isDefault) ?? workflows[0];
    if (!defaultWorkflow) return null;

    const statuses = await this.workflowsService.getStatuses(defaultWorkflow.id);
    if (statuses.length === 0) return null;

    if (requestedStatusId) {
      const match = statuses.find((s) => s.id === requestedStatusId);
      if (match) return match.id;
    }

    const todo =
      statuses.find((s) => s.type === 'TODO') ??
      statuses.find((s) => s.name.toLowerCase() === 'to do') ??
      statuses[0];
    return todo?.id ?? null;
  }
}
