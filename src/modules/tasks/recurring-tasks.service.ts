import { Inject, Injectable, Logger, NotFoundException, BadRequestException, forwardRef } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskRecurrenceDto } from './dto/recurrence.dto';
import {
  CompleteRecurringTaskDto,
  RecurringTasksQueryDto,
  SkipNextOccurrenceDto,
  UpdateRecurringTemplateDto,
} from './dto/recurring-actions.dto';
import { RecurringTaskTemplatesRepository } from './repositories/recurring-task-templates.repository';
import { RecurringTaskOccurrencesRepository } from './repositories/recurring-task-occurrences.repository';
import { TasksRepository } from './repositories/tasks.repository';
import { TasksService } from './tasks.service';
import { TaskNotificationsService } from './task-notifications.service';
import { ProjectsRepository } from '../projects/repositories/projects.repository';
import type { TaskEntity } from './entities/task.entity';
import type { RecurringTaskTemplateEntity } from './entities/recurring-task-template.entity';
import { generateUuid } from '../../common/utils/uuid.util';
import {
  computeNextRecurringDueDate,
  computeChecklistItemDueDate,
  shouldStopRecurrence,
  subtractDays,
  toYmd,
} from './recurrence.util';

type TemplateSubtask = NonNullable<
  import('./entities/recurring-task-template.entity').RecurringTaskTemplateEntity['templateSubtasks']
>[number];

function normalizeTemplateSubtasks(
  subtasks?: CreateTaskDto['subtasks'] | null,
): import('./entities/recurring-task-template.entity').RecurringTaskTemplateEntity['templateSubtasks'] {
  // Explicit empty checklist must stay empty ([]), not null — null is treated as
  // "unset" and gets re-hydrated from a seed run (resurrecting deleted items).
  if (subtasks == null) return null;
  if (!subtasks.length) return [];
  return subtasks.map((s) => {
    const assigneeIds = s.assigneeIds?.length
      ? Array.from(new Set(s.assigneeIds.map((id) => String(id).trim()).filter(Boolean)))
      : s.assigneeId
        ? [String(s.assigneeId).trim()]
        : [];
    return {
      id: s.id ?? generateUuid(),
      title: s.title,
      completed: false,
      description: s.description,
      ...(assigneeIds.length
        ? { assigneeIds, assigneeId: assigneeIds[0] }
        : s.assigneeId
          ? { assigneeId: s.assigneeId }
          : {}),
      priority: s.priority,
      status: (s.status as 'TODO' | 'IN_PROGRESS' | 'DONE') ?? 'TODO',
      statusId: s.statusId,
      dueOffsetDays: s.dueOffsetDays ?? 0,
      ...(s.dueTime ? { dueTime: s.dueTime } : {}),
      ...(s.notifyMinutesBefore != null
        ? { notifyMinutesBefore: Number(s.notifyMinutesBefore) }
        : {}),
    };
  });
}

function cloneTemplateSubtasksForOccurrence(
  templateSubtasks: import('./entities/recurring-task-template.entity').RecurringTaskTemplateEntity['templateSubtasks'],
  runDueDateYmd: string,
): NonNullable<TaskEntity['subtasks']> {
  if (!templateSubtasks?.length) return [];
  return templateSubtasks.map((s: TemplateSubtask) => {
    let dueDate: string | undefined;
    if (s.dueOffsetDays != null || s.dueTime) {
      dueDate = computeChecklistItemDueDate(runDueDateYmd, s.dueOffsetDays ?? 0);
    } else if (s.dueDate) {
      dueDate = String(s.dueDate).slice(0, 10);
    }
    const assigneeIds = s.assigneeIds?.length
      ? s.assigneeIds
      : s.assigneeId
        ? [s.assigneeId]
        : [];
    return {
      id: generateUuid(),
      title: s.title,
      completed: false,
      description: s.description,
      ...(assigneeIds.length ? { assigneeIds, assigneeId: assigneeIds[0] } : {}),
      ...(dueDate ? { dueDate } : {}),
      ...(s.dueTime ? { dueTime: s.dueTime } : {}),
      ...(s.notifyMinutesBefore != null
        ? { notifyMinutesBefore: Number(s.notifyMinutesBefore) }
        : {}),
      status: 'TODO' as const,
      priority: s.priority,
      statusId: s.statusId,
    };
  });
}

function nowYmd(): string {
  return toYmd(new Date());
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  copy.setDate(copy.getDate() + (7 - day));
  copy.setHours(23, 59, 59, 999);
  return copy;
}

@Injectable()
export class RecurringTasksService {
  private readonly logger = new Logger(RecurringTasksService.name);

  constructor(
    private readonly templatesRepository: RecurringTaskTemplatesRepository,
    private readonly occurrencesRepository: RecurringTaskOccurrencesRepository,
    private readonly tasksRepository: TasksRepository,
    private readonly projectsRepository: ProjectsRepository,
    @Inject(forwardRef(() => TasksService))
    private readonly tasksService: TasksService,
    @Inject(forwardRef(() => TaskNotificationsService))
    private readonly taskNotifications: TaskNotificationsService,
  ) {}

  /** Resolve the canonical project/org pair required by tasks FK constraints. */
  private async resolveProjectContext(
    projectId: string,
  ): Promise<{ projectId: string; organizationId: string } | null> {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) return null;
    return { projectId: project.id, organizationId: project.organizationId };
  }

  async attachRecurrenceToTask(params: {
    taskId: string;
    organizationId: string;
    reporterId: string;
    projectId: string;
    title: string;
    description?: string | null;
    statusId?: string | null;
    priority?: string | null;
    assigneeId?: string | null;
    assigneeIds?: string[] | null;
    storyPoints?: number | null;
    subtasks?: CreateTaskDto['subtasks'];
    tags?: Array<{ name: string; color: string }> | null;
    dueDate?: string | null;
    dueTime?: string | null;
    recurrence: TaskRecurrenceDto;
  }): Promise<void> {
    const repeat = params.recurrence.repeat ?? 'NONE';
    if (repeat === 'NONE') return;

    const dueDate = params.dueDate ?? nowYmd();
    const nextDueDate = computeNextRecurringDueDate(dueDate, dueDate, params.recurrence);
    const templateSubtasks = normalizeTemplateSubtasks(params.subtasks);
    const recurrenceForRule: TaskRecurrenceDto = { ...params.recurrence };
    const ruleTimeRaw =
      typeof recurrenceForRule.dueTime === 'string' ? recurrenceForRule.dueTime.trim() : '';
    if (!/^([01]\d|2[0-3]):[0-5]\d/.test(ruleTimeRaw) && params.dueTime) {
      const taskTime = String(params.dueTime).trim();
      if (/^([01]\d|2[0-3]):[0-5]\d/.test(taskTime)) {
        recurrenceForRule.dueTime = taskTime.slice(0, 5);
        recurrenceForRule.dueLogic = recurrenceForRule.dueLogic ?? 'DUE_TIME';
      }
    }
    const template = await this.templatesRepository.create({
      organizationId: params.organizationId,
      projectId: params.projectId,
      createdBy: params.reporterId,
      title: params.title,
      description: params.description ?? null,
      statusId: params.statusId ?? null,
      priority: params.priority ?? 'MEDIUM',
      assigneeId: params.assigneeId ?? null,
      assigneeIds: params.assigneeIds?.length ? params.assigneeIds : null,
      storyPoints: params.storyPoints ?? null,
      templateSubtasks,
      tags: params.tags?.length ? params.tags : null,
      repeatType: repeat,
      ruleConfig: recurrenceForRule as unknown as Record<string, unknown>,
      createDaysBeforeDue: recurrenceForRule.createDaysBeforeDue ?? 0,
      startDueDate: dueDate as unknown as Date,
      nextDueDate: nextDueDate as unknown as Date,
      lastGeneratedDueDate: dueDate as unknown as Date,
      lastSequence: 1,
      generatedCount: 1,
      endType: recurrenceForRule.endType ?? 'NEVER',
      endDate: recurrenceForRule.endDate ? (recurrenceForRule.endDate as unknown as Date) : null,
      endAfterOccurrences: recurrenceForRule.endAfterOccurrences ?? null,
      isPaused: false,
      stoppedAt: null,
    });

    await this.occurrencesRepository.create({
      templateId: template.id,
      organizationId: params.organizationId,
      projectId: params.projectId,
      taskId: params.taskId,
      sequenceNumber: 1,
      dueDate: dueDate as unknown as Date,
      state: 'PENDING',
      completedAt: null,
    });

    await this.tasksRepository.update(params.taskId, {
      recurringTemplateId: template.id,
      recurrenceType: repeat,
      recurrenceSequence: 1,
    } as never);

    if (templateSubtasks?.length) {
      await this.tasksRepository.update(params.taskId, {
        subtasks: cloneTemplateSubtasksForOccurrence(templateSubtasks, dueDate),
      } as never);
    }
  }

  async updateRecurrenceFromTask(
    taskId: string,
    organizationId: string,
    dto: TaskRecurrenceDto,
  ): Promise<void> {
    const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
    if (!task) throw new NotFoundException('Task not found');
    const repeat = dto.repeat ?? 'NONE';

    if (repeat === 'NONE') {
      if (task.recurringTemplateId) {
        await this.templatesRepository.update(task.recurringTemplateId, {
          isPaused: true,
          stoppedAt: new Date(),
        });
      }
      await this.tasksRepository.update(task.id, {
        recurringTemplateId: null,
        recurrenceType: null,
        recurrenceSequence: null,
      } as never);
      return;
    }

    if (!task.recurringTemplateId) {
      await this.attachRecurrenceToTask({
        taskId: task.id,
        organizationId,
        reporterId: task.reporterId,
        projectId: task.projectId,
        title: task.title,
        description: task.description,
        statusId: task.statusId,
        priority: task.priority,
        assigneeId: task.assigneeId,
        assigneeIds: task.assigneeIds ?? null,
        storyPoints: task.storyPoints,
        subtasks: task.subtasks ?? undefined,
        tags: task.tags ?? null,
        dueDate: task.dueDate ? String(task.dueDate).slice(0, 10) : null,
        recurrence: dto,
      });
      return;
    }

    const template = await this.templatesRepository.findByIdAndOrganization(task.recurringTemplateId, organizationId);
    if (!template) return;
    await this.templatesRepository.update(template.id, {
      repeatType: repeat,
      ruleConfig: dto as unknown as Record<string, unknown>,
      createDaysBeforeDue: dto.createDaysBeforeDue ?? template.createDaysBeforeDue ?? 0,
      endType: dto.endType ?? template.endType ?? 'NEVER',
      endDate: dto.endDate ? (dto.endDate as unknown as Date) : null,
      endAfterOccurrences: dto.endAfterOccurrences ?? null,
      isPaused: false,
      stoppedAt: null,
    });
    await this.tasksRepository.update(task.id, {
      recurrenceType: repeat,
    } as never);
  }

  async syncOccurrenceCompletionFromTaskStatus(
    taskId: string,
    isCompleted: boolean,
  ): Promise<void> {
    const occurrence = await this.occurrencesRepository.findByTaskId(taskId);
    if (!occurrence) return;
    await this.occurrencesRepository.update(occurrence.id, {
      state: isCompleted ? 'COMPLETED' : 'PENDING',
      completedAt: isCompleted ? new Date() : null,
    });
  }

  async generateDueOccurrences(
    today = nowYmd(),
    scope?: { organizationId: string; projectId: string },
  ): Promise<{ generated: number }> {
    let generated = 0;
    const dueTemplates = scope
      ? (await this.templatesRepository.findByOrganization(scope.organizationId, scope.projectId)).filter(
          (t) => !t.isPaused && String(t.nextDueDate).slice(0, 10) <= today,
        )
      : await this.templatesRepository.findDueTemplates(today);

    for (const template of dueTemplates) {
      try {
        generated += await this.generateOccurrencesForTemplate(template, today);
      } catch (error) {
        this.logger.warn(
          `Skipped recurring generation for template ${template.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    return { generated };
  }

  private async generateOccurrencesForTemplate(
    template: import('./entities/recurring-task-template.entity').RecurringTaskTemplateEntity,
    today: string,
  ): Promise<number> {
    const projectCtx = await this.resolveProjectContext(template.projectId);
    if (!projectCtx) {
      this.logger.warn(
        `Skipping recurring template "${template.title}" (${template.id}): project ${template.projectId} no longer exists`,
      );
      return 0;
    }

    let generated = 0;
    const recurrence = (template.ruleConfig ?? {}) as TaskRecurrenceDto;
    const createDays = Math.max(0, template.createDaysBeforeDue ?? 0);
    let nextDueDate = String(template.nextDueDate).slice(0, 10);
    let guard = 0;
    while (guard < 25) {
      guard += 1;
      const createOn = subtractDays(nextDueDate, createDays);
      if (createOn > today) break;
      if (shouldStopRecurrence(template.generatedCount, nextDueDate, recurrence)) {
        await this.templatesRepository.update(template.id, {
          isPaused: true,
          stoppedAt: new Date(),
        });
        break;
      }

      const nextSequence = (template.lastSequence ?? 0) + 1;
      const existing = await this.occurrencesRepository.findByTemplateAndSequence(
        template.id,
        nextSequence,
      );
      // Idempotency: never create a second non-skipped run for the same date,
      // even if the scheduler runs concurrently or sequence math repeats a date.
      const sameDate = await this.occurrencesRepository.findByTemplateAndDueDate(
        template.id,
        nextDueDate,
      );
      const hasActiveRunForDate = sameDate.some((o) => o.state !== 'SKIPPED');
      if (!existing && !hasActiveRunForDate) {
        const createdTask = await this.tasksService.create(
          projectCtx.projectId,
          projectCtx.organizationId,
          template.createdBy,
          {
            projectId: projectCtx.projectId,
            organizationId: projectCtx.organizationId,
            title: template.title,
            description: template.description ?? undefined,
            statusId: template.statusId ?? undefined,
            priority: template.priority,
            assigneeId: template.assigneeId ?? undefined,
            assigneeIds: template.assigneeIds ?? undefined,
            dueDate: nextDueDate,
            storyPoints: template.storyPoints ?? undefined,
            tags: template.tags ?? undefined,
            subtasks: cloneTemplateSubtasksForOccurrence(template.templateSubtasks, nextDueDate),
          },
        );
        await this.tasksRepository.update(createdTask.id, {
          recurringTemplateId: template.id,
          recurrenceType: template.repeatType,
          recurrenceSequence: nextSequence,
        } as never);
        await this.occurrencesRepository.create({
          templateId: template.id,
          organizationId: projectCtx.organizationId,
          projectId: projectCtx.projectId,
          taskId: createdTask.id,
          sequenceNumber: nextSequence,
          dueDate: nextDueDate as unknown as Date,
          state: 'PENDING',
          completedAt: null,
        });
        generated += 1;
      }

      const following = computeNextRecurringDueDate(
        nextDueDate,
        String(template.startDueDate).slice(0, 10),
        recurrence,
      );
      template.lastSequence = nextSequence;
      template.generatedCount = (template.generatedCount ?? 0) + 1;
      template.lastGeneratedDueDate = nextDueDate as unknown as Date;
      template.nextDueDate = following as unknown as Date;
      nextDueDate = following;
      await this.templatesRepository.update(template.id, {
        lastSequence: template.lastSequence,
        generatedCount: template.generatedCount,
        lastGeneratedDueDate: template.lastGeneratedDueDate,
        nextDueDate: template.nextDueDate,
      });
    }
    return generated;
  }

  /** Re-link occurrences whose template row was deleted to the project's active series. */
  private async resolveTemplateForOccurrence(
    occurrence: import('./entities/recurring-task-occurrence.entity').RecurringTaskOccurrenceEntity,
    templateMap: Map<string, import('./entities/recurring-task-template.entity').RecurringTaskTemplateEntity>,
    organizationId: string,
    projectId: string,
  ): Promise<import('./entities/recurring-task-template.entity').RecurringTaskTemplateEntity | null> {
    let template =
      templateMap.get(occurrence.templateId) ??
      (await this.templatesRepository.findById(occurrence.templateId));

    if (
      template &&
      template.organizationId === organizationId &&
      template.projectId === projectId &&
      !template.isPaused
    ) {
      templateMap.set(template.id, template);
      return template;
    }

    const activeTemplates = [...templateMap.values()].filter((t) => !t.isPaused);
    if (activeTemplates.length === 1) {
      template = activeTemplates[0]!;
      if (occurrence.templateId !== template.id) {
        this.logger.warn(
          `Occurrence ${occurrence.id} references deleted template; using active series "${template.title}" for repair`,
        );
      }
      return template;
    }

    return null;
  }

  /** Repair missing task links, materialize overdue occurrences, and fix metadata for board display. */
  async syncBoardTasks(organizationId: string, projectId: string): Promise<{ materialized: number; repaired: number }> {
    await this.generateDueOccurrences(nowYmd(), { organizationId, projectId });
    const templates = await this.templatesRepository.findByOrganization(organizationId, projectId);
    const templateMap = new Map(templates.map((t) => [t.id, t]));
    await this.purgeOrphanRecurringRuns(organizationId, projectId, templateMap);
    const pending = await this.occurrencesRepository.findPendingByProject(organizationId, projectId);
    const existingTasks = await this.tasksRepository.findRecurringByProject(projectId, organizationId);
    const tasksById = new Map(existingTasks.map((t) => [t.id, t]));
    let materialized = 0;
    let repaired = 0;

    for (const occ of pending) {
      const template = await this.resolveTemplateForOccurrence(
        occ,
        templateMap,
        organizationId,
        projectId,
      );
      if (!template) continue;

      let task = occ.taskId ? tasksById.get(occ.taskId) ?? null : null;
      if (occ.taskId && !task) {
        // Stale link — clear and rematerialize below.
        await this.occurrencesRepository.update(occ.id, { taskId: null });
      }

      if (!task) {
        const ok = await this.materializeOccurrence(occ, template);
        if (ok) {
          materialized += 1;
          const refreshed = await this.occurrencesRepository.findById(occ.id);
          if (refreshed?.taskId) {
            const created = await this.tasksRepository.findByIdAndOrganization(
              refreshed.taskId,
              organizationId,
            );
            if (created) tasksById.set(created.id, created);
          }
        }
        continue;
      }

      if (!task.recurrenceType || task.recurrenceType === 'NONE') {
        await this.tasksRepository.update(task.id, {
          recurrenceType: template.repeatType,
          recurrenceSequence: task.recurrenceSequence ?? occ.sequenceNumber,
          recurringTemplateId: template.id,
        } as never);
        repaired += 1;
      }
    }

    for (const task of tasksById.values()) {
      if (!task.recurringTemplateId) continue;
      const template = templateMap.get(task.recurringTemplateId);
      if (!template) continue;
      if (!task.recurrenceType || task.recurrenceType === 'NONE') {
        await this.tasksRepository.update(task.id, {
          recurrenceType: template.repeatType,
          recurrenceSequence: task.recurrenceSequence ?? 1,
        } as never);
        repaired += 1;
      }
      if (
        (!task.subtasks || task.subtasks.length === 0) &&
        template.templateSubtasks?.length
      ) {
        await this.tasksRepository.update(task.id, {
          subtasks: cloneTemplateSubtasksForOccurrence(
            template.templateSubtasks,
            String(task.dueDate).slice(0, 10),
          ),
        } as never);
        repaired += 1;
      }
    }

    return { materialized, repaired };
  }

  /** Tasks for recurring board with overdue occurrence ids. */
  async getBoardView(
    organizationId: string,
    projectId: string,
    validStatusIds: string[] = [],
    options?: { sync?: boolean; calendarOnly?: boolean },
  ): Promise<{ tasks: import('./entities/task.entity').TaskEntity[]; overdueTaskIds: string[] }> {
    if (options?.sync !== false) {
      await this.syncBoardTasks(organizationId, projectId);
    }
    if (options?.calendarOnly) {
      const tasks = await this.mergeBoardTasks(projectId, organizationId, []);
      return { tasks, overdueTaskIds: [] };
    }
    const today = nowYmd();
    const pending = await this.occurrencesRepository.findPendingByProject(organizationId, projectId);
    // Sync already materialized missing runs — only collect overdue task ids here.
    const overdueTaskIds = [
      ...new Set(
        pending
          .filter((occ) => String(occ.dueDate).slice(0, 10) < today && !!occ.taskId)
          .map((occ) => occ.taskId as string),
      ),
    ];

    const tasks = await this.mergeBoardTasks(projectId, organizationId, overdueTaskIds);

    const statusIdSet = new Set(validStatusIds.filter(Boolean));
    const fallbackStatusId = validStatusIds[0];
    if (statusIdSet.size > 0 && fallbackStatusId) {
      const toFix = tasks.filter((task) => task.statusId && !statusIdSet.has(task.statusId));
      await Promise.all(
        toFix.map(async (task) => {
          await this.tasksRepository.update(task.id, { statusId: fallbackStatusId });
          task.statusId = fallbackStatusId;
        }),
      );
    }

    return {
      tasks,
      overdueTaskIds,
    };
  }

  private async mergeBoardTasks(
    projectId: string,
    organizationId: string,
    overdueTaskIds: string[],
  ): Promise<import('./entities/task.entity').TaskEntity[]> {
    const templates = await this.templatesRepository.findByOrganization(organizationId, projectId);
    const activeTemplateIds = new Set(templates.map((t) => t.id));
    const tasks = await this.tasksRepository.findRecurringByProject(projectId, organizationId);
    const byId = new Map<string, import('./entities/task.entity').TaskEntity>();

    for (const task of tasks) {
      if (task.recurringTemplateId && !activeTemplateIds.has(task.recurringTemplateId)) {
        continue;
      }
      byId.set(task.id, task);
    }

    for (const taskId of overdueTaskIds) {
      if (byId.has(taskId)) continue;
      const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
      if (!task) continue;
      if (task.recurringTemplateId && !activeTemplateIds.has(task.recurringTemplateId)) {
        continue;
      }
      byId.set(task.id, task);
    }
    return [...byId.values()];
  }

  /** Remove generated runs left behind when a series template was deleted. */
  private async purgeOrphanRecurringRuns(
    organizationId: string,
    projectId: string,
    templateMap: Map<string, import('./entities/recurring-task-template.entity').RecurringTaskTemplateEntity>,
  ): Promise<void> {
    const occurrences = await this.occurrencesRepository.statsByOrganization(organizationId, projectId);
    for (const occ of occurrences) {
      if (templateMap.has(occ.templateId)) continue;
      if (occ.taskId) {
        try {
          await this.tasksService.delete(occ.taskId, organizationId);
        } catch {
          await this.tasksRepository.delete(occ.taskId).catch(() => {});
        }
      }
      await this.occurrencesRepository.deleteById(occ.id);
    }

    const recurringTasks = await this.tasksRepository.findRecurringByProject(projectId, organizationId);
    for (const task of recurringTasks) {
      if (!task.recurringTemplateId || templateMap.has(task.recurringTemplateId)) continue;
      try {
        await this.tasksService.delete(task.id, organizationId);
      } catch {
        await this.tasksRepository.delete(task.id).catch(() => {});
      }
    }
  }

  private async materializeOccurrence(
    occurrence: import('./entities/recurring-task-occurrence.entity').RecurringTaskOccurrenceEntity,
    template: import('./entities/recurring-task-template.entity').RecurringTaskTemplateEntity,
  ): Promise<boolean> {
    const projectCtx = await this.resolveProjectContext(template.projectId);
    if (!projectCtx) {
      this.logger.warn(
        `Cannot materialize occurrence ${occurrence.id}: project ${template.projectId} not found`,
      );
      return false;
    }

    const dueYmd = String(occurrence.dueDate).slice(0, 10);
    const rule = (template.ruleConfig ?? {}) as Record<string, unknown>;
    const ruleTimeRaw = typeof rule.dueTime === 'string' ? rule.dueTime.trim() : '';
    const dueTime =
      /^([01]\d|2[0-3]):[0-5]\d/.test(ruleTimeRaw) ? ruleTimeRaw.slice(0, 5) : undefined;
    try {
      const createdTask = await this.tasksService.create(
        projectCtx.projectId,
        projectCtx.organizationId,
        template.createdBy,
        {
          projectId: projectCtx.projectId,
          organizationId: projectCtx.organizationId,
          title: template.title,
          description: template.description ?? undefined,
          statusId: template.statusId ?? undefined,
          priority: template.priority,
          assigneeId: template.assigneeId ?? undefined,
          assigneeIds: template.assigneeIds ?? undefined,
          dueDate: dueYmd,
          dueTime,
          storyPoints: template.storyPoints ?? undefined,
          tags: template.tags ?? undefined,
          subtasks: cloneTemplateSubtasksForOccurrence(template.templateSubtasks, dueYmd),
        },
      );
      await this.tasksRepository.update(createdTask.id, {
        recurringTemplateId: template.id,
        recurrenceType: template.repeatType,
        recurrenceSequence: occurrence.sequenceNumber,
      } as never);
      await this.occurrencesRepository.update(occurrence.id, { taskId: createdTask.id });
      return true;
    } catch (error) {
      this.logger.warn(
        `Failed to materialize occurrence ${occurrence.id} for "${template.title}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  async getSummary(organizationId: string, projectId?: string) {
    const templates = await this.templatesRepository.findByOrganization(organizationId, projectId);
    const occurrences = await this.occurrencesRepository.statsByOrganization(organizationId, projectId);
    const now = new Date();
    const eow = endOfWeek(now);
    const monthStart = startOfMonth(now);

    const dueThisWeek = occurrences.filter((o) => {
      const due = new Date(o.dueDate);
      return o.state === 'PENDING' && due >= now && due <= eow;
    }).length;
    const overdue = occurrences.filter((o) => {
      const due = new Date(o.dueDate);
      return o.state === 'PENDING' && due < now;
    }).length;
    const completedThisMonth = occurrences.filter((o) => {
      if (!o.completedAt) return false;
      return o.state === 'COMPLETED' && new Date(o.completedAt) >= monthStart;
    }).length;
    const paused = templates.filter((t) => t.isPaused).length;
    return {
      totalRecurringTasks: templates.length,
      dueThisWeek,
      overdue,
      completedThisMonth,
      paused,
    };
  }

  /**
   * Habit-style analytics for recurring series over a trailing window.
   * Success rate, streaks and on-time rate are computed from occurrence
   * states (the canonical source), ignoring not-yet-due future runs.
   */
  async getAnalytics(organizationId: string, projectId?: string, days = 30) {
    const rangeDays = Math.min(Math.max(Math.floor(days) || 30, 1), 365);
    const templates = await this.templatesRepository.findByOrganization(organizationId, projectId);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const windowStart = new Date(todayStart);
    windowStart.setDate(windowStart.getDate() - (rangeDays - 1));

    const habits: Array<{
      templateId: string;
      title: string;
      repeatType: string;
      isPaused: boolean;
      total: number;
      completed: number;
      missed: number;
      skipped: number;
      successRate: number;
      currentStreak: number;
      longestStreak: number;
      onTimeRate: number;
      recentRuns: string[];
    }> = [];

    let ovTotal = 0;
    let ovCompleted = 0;
    let ovMissed = 0;
    let ovSkipped = 0;
    let ovBestStreak = 0;

    for (const tpl of templates) {
      const history = await this.occurrencesRepository.findByTemplate(tpl.id);

      // Resolved runs are those whose due date has passed (or already
      // completed/skipped). Future PENDING runs are excluded from rates.
      const resolved = history
        .filter((o) => {
          const due = new Date(o.dueDate);
          if (o.state === 'COMPLETED' || o.state === 'SKIPPED') return due >= windowStart;
          // PENDING counts as "missed" only once its due date is in the past.
          return due >= windowStart && due < todayStart;
        })
        .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

      let completed = 0;
      let missed = 0;
      let skipped = 0;
      let onTime = 0;
      let currentStreak = 0;
      let longestStreak = 0;
      let runningStreak = 0;
      const recentRuns: string[] = [];

      for (const o of resolved) {
        let label: 'completed' | 'missed' | 'skipped';
        if (o.state === 'COMPLETED') {
          label = 'completed';
          completed += 1;
          const dueEnd = new Date(o.dueDate);
          dueEnd.setHours(23, 59, 59, 999);
          if (o.completedAt && new Date(o.completedAt) <= dueEnd) onTime += 1;
          runningStreak += 1;
          if (runningStreak > longestStreak) longestStreak = runningStreak;
        } else if (o.state === 'SKIPPED') {
          label = 'skipped';
          skipped += 1;
          // Skips are intentional pauses; they neither extend nor break a streak.
        } else {
          label = 'missed';
          missed += 1;
          runningStreak = 0;
        }
        recentRuns.push(label);
      }

      // Current streak: trailing consecutive completed (skips are transparent).
      for (let i = resolved.length - 1; i >= 0; i -= 1) {
        const st = resolved[i].state;
        if (st === 'COMPLETED') currentStreak += 1;
        else if (st === 'SKIPPED') continue;
        else break;
      }

      const denominator = completed + missed;
      const successRate = denominator > 0 ? Math.round((completed / denominator) * 100) : 0;
      const onTimeRate = completed > 0 ? Math.round((onTime / completed) * 100) : 0;

      ovTotal += completed + missed + skipped;
      ovCompleted += completed;
      ovMissed += missed;
      ovSkipped += skipped;
      if (currentStreak > ovBestStreak) ovBestStreak = currentStreak;

      habits.push({
        templateId: tpl.id,
        title: tpl.title,
        repeatType: tpl.repeatType,
        isPaused: tpl.isPaused,
        total: completed + missed + skipped,
        completed,
        missed,
        skipped,
        successRate,
        currentStreak,
        longestStreak,
        onTimeRate,
        recentRuns: recentRuns.slice(-14),
      });
    }

    // Surface the most consistent habits first.
    habits.sort((a, b) => b.successRate - a.successRate || b.completed - a.completed);

    const ovDenominator = ovCompleted + ovMissed;
    const overallSuccessRate =
      ovDenominator > 0 ? Math.round((ovCompleted / ovDenominator) * 100) : 0;

    return {
      rangeDays,
      overall: {
        habits: templates.length,
        totalRuns: ovTotal,
        completed: ovCompleted,
        missed: ovMissed,
        skipped: ovSkipped,
        successRate: overallSuccessRate,
        bestStreak: ovBestStreak,
      },
      habits,
    };
  }

  async listTemplates(organizationId: string, query: RecurringTasksQueryDto) {
    const templates = await this.templatesRepository.findByOrganization(organizationId, query.projectId);
    const now = new Date();
    const items: Array<{
      id: string;
      title: string;
      description: string | null;
      repeatType: string;
      nextDueDate: Date;
      isPaused: boolean;
      status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
      stoppedAt: Date | null;
      generatedCount: number;
      upcoming: number;
      completed: number;
      missed: number;
      lastRunState: string | null;
      completionHealth: number;
      subtaskCount: number;
      assigneeId: string | null;
      assigneeIds: string[] | null;
      priority: string;
      createdBy: string;
      startDueDate: Date;
      endType: string;
      endDate: Date | null;
      endAfterOccurrences: number | null;
      createDaysBeforeDue: number;
      ruleConfig: Record<string, unknown> | null;
      templateSubtasks: Array<{
        id: string;
        title: string;
        completed: boolean;
        description?: string;
        assigneeId?: string;
        assigneeIds?: string[];
        dueDate?: string;
        dueOffsetDays?: number;
        dueTime?: string;
        status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
        priority?: string;
        statusId?: string;
      }>;
    }> = [];
    for (const tpl of templates) {
      const history = await this.occurrencesRepository.findByTemplate(tpl.id);
      const upcoming = history.filter((h) => h.state === 'PENDING').length;
      const completed = history.filter((h) => h.state === 'COMPLETED').length;
      const missed = history.filter(
        (h) => h.state === 'PENDING' && new Date(h.dueDate) < now,
      ).length;
      // Most recent resolved run (completed/skipped) by sequence for "last run status".
      const lastResolved = [...history]
        .filter((h) => h.state === 'COMPLETED' || h.state === 'SKIPPED')
        .sort((a, b) => b.sequenceNumber - a.sequenceNumber)[0];
      const status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' = tpl.isPaused
        ? tpl.stoppedAt
          ? 'ARCHIVED'
          : 'PAUSED'
        : 'ACTIVE';
      const completionHealth =
        tpl.generatedCount > 0
          ? Math.round((completed / tpl.generatedCount) * 100)
          : 0;

      // Checklist often lives on the seed/run task when users edit a run.
      // Hydrate for the API response only when the template column is truly unset
      // (null). An explicit empty array [] means the checklist was cleared — do not
      // re-import deleted items from a seed run.
      let templateSubtasks = tpl.templateSubtasks;
      if (templateSubtasks == null) {
        const seedOcc = [...history].sort((a, b) => a.sequenceNumber - b.sequenceNumber).find((h) => h.taskId);
        if (seedOcc?.taskId) {
          const seedTask = await this.tasksRepository.findById(seedOcc.taskId);
          if (seedTask?.subtasks?.length) {
            const hydrated = normalizeTemplateSubtasks(
              seedTask.subtasks.map((s) => ({
                id: s.id,
                title: s.title,
                description: s.description,
                assigneeId: s.assigneeId,
                assigneeIds: s.assigneeIds,
                dueOffsetDays: 0,
                dueTime: s.dueTime,
                notifyMinutesBefore: s.notifyMinutesBefore,
                priority: s.priority,
                status: (s.status as 'TODO' | 'IN_PROGRESS' | 'DONE') ?? 'TODO',
                statusId: s.statusId,
              })),
            );
            if (hydrated?.length) {
              templateSubtasks = hydrated;
            } else {
              templateSubtasks = [];
            }
          } else {
            templateSubtasks = [];
          }
        } else {
          templateSubtasks = [];
        }
      }

      items.push({
        id: tpl.id,
        title: tpl.title,
        description: tpl.description ?? null,
        repeatType: tpl.repeatType,
        nextDueDate: tpl.nextDueDate,
        isPaused: tpl.isPaused,
        status,
        stoppedAt: tpl.stoppedAt ?? null,
        generatedCount: tpl.generatedCount,
        upcoming,
        completed,
        missed,
        lastRunState: lastResolved?.state ?? null,
        completionHealth,
        subtaskCount: templateSubtasks.length,
        assigneeId: tpl.assigneeId ?? null,
        assigneeIds: tpl.assigneeIds ?? null,
        priority: tpl.priority,
        createdBy: tpl.createdBy,
        startDueDate: tpl.startDueDate,
        endType: tpl.endType,
        endDate: tpl.endDate ?? null,
        endAfterOccurrences: tpl.endAfterOccurrences ?? null,
        createDaysBeforeDue: tpl.createDaysBeforeDue,
        // Needed so clients can expand WEEKLY calendars with weeklyDays / interval.
        ruleConfig: tpl.ruleConfig ?? null,
        templateSubtasks,
      });
    }
    return items;
  }

  async getTemplateHistory(templateId: string, organizationId: string) {
    const template = await this.templatesRepository.findByIdAndOrganization(templateId, organizationId);
    if (!template) throw new NotFoundException('Recurring template not found');
    return this.occurrencesRepository.findByTemplate(templateId);
  }

  async pauseTemplate(templateId: string, organizationId: string) {
    const template = await this.templatesRepository.findByIdAndOrganization(templateId, organizationId);
    if (!template) throw new NotFoundException('Recurring template not found');
    await this.templatesRepository.update(template.id, { isPaused: true, stoppedAt: null });
    return { success: true };
  }

  /**
   * Archive a series: paused + stopped so it no longer generates runs.
   * Distinct from pause (which is reversible without losing the "active" intent).
   * Resume clears both flags, returning the series to active.
   */
  async archiveTemplate(templateId: string, organizationId: string) {
    const template = await this.templatesRepository.findByIdAndOrganization(templateId, organizationId);
    if (!template) throw new NotFoundException('Recurring template not found');
    await this.templatesRepository.update(template.id, {
      isPaused: true,
      stoppedAt: new Date(),
    });
    return { success: true };
  }

  async resumeTemplate(templateId: string, organizationId: string) {
    const template = await this.templatesRepository.findByIdAndOrganization(templateId, organizationId);
    if (!template) throw new NotFoundException('Recurring template not found');
    await this.templatesRepository.update(template.id, { isPaused: false, stoppedAt: null });
    return { success: true };
  }

  async skipNextOccurrence(templateId: string, organizationId: string, dto: SkipNextOccurrenceDto) {
    const template = await this.templatesRepository.findByIdAndOrganization(templateId, organizationId);
    if (!template) throw new NotFoundException('Recurring template not found');
    const recurrence = (template.ruleConfig ?? {}) as TaskRecurrenceDto;
    const steps = Math.max(1, dto.steps ?? 1);
    let due = String(template.nextDueDate).slice(0, 10);
    let seq = template.lastSequence ?? 0;
    for (let i = 0; i < steps; i++) {
      seq += 1;
      await this.occurrencesRepository.create({
        templateId: template.id,
        organizationId: template.organizationId,
        projectId: template.projectId,
        taskId: null,
        sequenceNumber: seq,
        dueDate: due as unknown as Date,
        state: 'SKIPPED',
        completedAt: null,
      });
      due = computeNextRecurringDueDate(
        due,
        String(template.startDueDate).slice(0, 10),
        recurrence,
      );
    }
    await this.templatesRepository.update(template.id, {
      lastSequence: seq,
      nextDueDate: due as unknown as Date,
    });
    return { success: true };
  }

  async deleteSeries(templateId: string, organizationId: string) {
    const template = await this.templatesRepository.findByIdAndOrganization(templateId, organizationId);
    if (!template) throw new NotFoundException('Recurring template not found');

    const occurrences = await this.occurrencesRepository.findByTemplate(templateId);
    const taskIds = new Set<string>();
    for (const occ of occurrences) {
      if (occ.taskId) taskIds.add(occ.taskId);
    }

    const linkedTasks = await this.tasksRepository.findByRecurringTemplate(templateId, organizationId);
    for (const task of linkedTasks) {
      taskIds.add(task.id);
    }

    // Drop occurrences first so board sync cannot rematerialize while tasks are deleted.
    await this.occurrencesRepository.deleteByTemplate(templateId);

    for (const taskId of taskIds) {
      try {
        await this.tasksService.delete(taskId, organizationId);
      } catch {
        await this.tasksRepository.delete(taskId).catch(() => {});
      }
    }

    await this.templatesRepository.delete(template.id);
    return { success: true };
  }

  /**
   * Remove the occurrence row for a planner run task so syncBoardTasks will not
   * rematerialize it after the task is deleted.
   */
  async removeOccurrenceForTask(taskId: string): Promise<void> {
    const occ = await this.occurrencesRepository.findByTaskId(taskId);
    if (!occ) return;
    await this.occurrencesRepository.deleteById(occ.id);
  }

  /**
   * Delete a single planner run (task + occurrence). Prefer this over raw task
   * delete so the run cannot come back on the next board sync.
   */
  async deleteRun(taskId: string, organizationId: string, userId: string) {
    const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
    if (!task) throw new NotFoundException('Task not found');
    if (!task.recurringTemplateId) {
      throw new BadRequestException('Task is not a planner run');
    }
    await this.tasksService.delete(taskId, organizationId, userId);
    return { success: true };
  }

  /**
   * Duplicate a series as a fresh active planner. Copies config + checklist
   * template but resets run history so it starts generating from the next due
   * date (today if the original anchor is already in the past).
   */
  async duplicateTemplate(templateId: string, organizationId: string) {
    const source = await this.templatesRepository.findByIdAndOrganization(templateId, organizationId);
    if (!source) throw new NotFoundException('Recurring template not found');

    const today = nowYmd();
    const sourceNext = String(source.nextDueDate).slice(0, 10);
    const startDate = sourceNext >= today ? sourceNext : today;

    const copy = await this.templatesRepository.create({
      organizationId: source.organizationId,
      projectId: source.projectId,
      createdBy: source.createdBy,
      title: `${source.title} (Copy)`.slice(0, 300),
      description: source.description ?? null,
      statusId: source.statusId ?? null,
      priority: source.priority,
      assigneeId: source.assigneeId ?? null,
      assigneeIds: source.assigneeIds?.length ? [...source.assigneeIds] : null,
      storyPoints: source.storyPoints ?? null,
      templateSubtasks: source.templateSubtasks?.length
        ? source.templateSubtasks.map((s) => ({ ...s, id: generateUuid() }))
        : null,
      tags: source.tags?.length ? source.tags.map((t) => ({ ...t })) : null,
      repeatType: source.repeatType,
      ruleConfig: source.ruleConfig ?? null,
      createDaysBeforeDue: source.createDaysBeforeDue,
      startDueDate: startDate as unknown as Date,
      nextDueDate: startDate as unknown as Date,
      lastGeneratedDueDate: null,
      lastSequence: 0,
      generatedCount: 0,
      endType: source.endType,
      endDate: source.endDate ?? null,
      endAfterOccurrences: source.endAfterOccurrences ?? null,
      isPaused: false,
      stoppedAt: null,
    });
    await this.generateOccurrencesForTemplate(copy, nowYmd());
    return { id: copy.id, success: true };
  }

  /** Copy series template subtasks onto an occurrence task when missing (per-run checklist). */
  async ensureOccurrenceSubtasks(
    taskId: string,
    organizationId: string,
  ): Promise<TaskEntity> {
    const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
    if (!task || !task.recurringTemplateId) {
      throw new NotFoundException('Recurring task not found');
    }
    if (task.subtasks?.length) return task;

    const template = await this.templatesRepository.findByIdAndOrganization(
      task.recurringTemplateId,
      organizationId,
    );
    if (!template?.templateSubtasks?.length) return task;

    const runDueDate = task.dueDate ? String(task.dueDate).slice(0, 10) : nowYmd();
    const subtasks = cloneTemplateSubtasksForOccurrence(template.templateSubtasks, runDueDate);
    await this.tasksRepository.update(task.id, { subtasks } as never);
    const refreshed = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
    if (!refreshed) throw new NotFoundException('Recurring task not found');
    // Notify newly assigned subtask members (same path as PATCH /tasks).
    this.taskNotifications.scheduleOnUpdate(task, refreshed, template.createdBy);
    return refreshed;
  }

  async completeTaskWithRecurringAction(
    taskId: string,
    organizationId: string,
    dto: CompleteRecurringTaskDto,
  ) {
    const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
    if (!task || !task.recurringTemplateId) throw new NotFoundException('Recurring task not found');
    const template = await this.templatesRepository.findByIdAndOrganization(
      task.recurringTemplateId,
      organizationId,
    );
    if (!template) throw new NotFoundException('Recurring template not found');
    const recurrence = (template.ruleConfig ?? {}) as TaskRecurrenceDto;
    const completionRule = recurrence.completionRule ?? 'ALL_CHECKLIST';
    if (completionRule === 'ALL_CHECKLIST') {
      const subs = task.subtasks ?? [];
      if (subs.length > 0) {
        const hasIncomplete = subs.some((s) => {
          const status = String(s?.status ?? '').toUpperCase();
          if (status) return status !== 'DONE';
          return !Boolean(s?.completed);
        });
        if (hasIncomplete) {
          throw new BadRequestException(
            'Complete all checklist items before marking this run done',
          );
        }
      }
    }
    const occurrence = await this.occurrencesRepository.findByTaskId(taskId);
    const now = new Date();
    const doneStatusId = dto.doneStatusId ?? task.statusId ?? undefined;
    if (doneStatusId) {
      await this.tasksRepository.update(taskId, { statusId: doneStatusId });
    }
    if (occurrence) {
      await this.occurrencesRepository.update(occurrence.id, {
        state: 'COMPLETED',
        completedAt: now,
      });
    }

    if (dto.action === 'THIS_AND_PREVIOUS_PENDING' && occurrence) {
      await this.occurrencesRepository.markPreviousPendingCompleted(
        template.id,
        occurrence.sequenceNumber,
        now,
      );
    }
    if (dto.action === 'STOP_SERIES_PERMANENTLY') {
      await this.templatesRepository.update(template.id, {
        isPaused: true,
        stoppedAt: now,
      });
    }
    return { success: true };
  }

  /**
   * When a run's checklist is edited, mirror titles/times onto the planner
   * template and all PENDING runs so deletes/renames do not leave ghosts.
   */
  async syncTemplateChecklistFromTaskSubtasks(
    templateId: string,
    organizationId: string,
    subtasks: NonNullable<TaskEntity['subtasks']>,
  ): Promise<void> {
    const template = await this.templatesRepository.findByIdAndOrganization(
      templateId,
      organizationId,
    );
    if (!template) return;
    const hydrated =
      (subtasks ?? []).length === 0
        ? []
        : normalizeTemplateSubtasks(
            (subtasks ?? []).map((s) => ({
              id: s.id,
              title: s.title,
              description: s.description,
              assigneeId: s.assigneeId,
              assigneeIds: s.assigneeIds,
              dueOffsetDays: 0,
              dueTime: s.dueTime,
              notifyMinutesBefore: s.notifyMinutesBefore,
              priority: s.priority,
              // Template steps are never "done" — only occurrence runs track completion.
              status: 'TODO' as const,
              statusId: s.statusId,
            })),
          );
    await this.templatesRepository.update(template.id, {
      templateSubtasks: hydrated,
    } as never);
    const updated = await this.templatesRepository.findById(template.id);
    if (!updated) return;

    await this.syncPendingOccurrenceAssignmentsFromTemplate({
      beforeTemplate: template,
      afterTemplate: updated,
      actorUserId: template.createdBy,
      syncAssignees: false,
      syncChecklist: true,
    });
  }

  async updateTemplate(
    templateId: string,
    organizationId: string,
    dto: UpdateRecurringTemplateDto,
    actorUserId: string,
  ) {
    const template = await this.templatesRepository.findByIdAndOrganization(templateId, organizationId);
    if (!template) throw new NotFoundException('Recurring template not found');

    const beforeAssigneeIds = template.assigneeIds?.length
      ? [...template.assigneeIds]
      : template.assigneeId
        ? [template.assigneeId]
        : [];
    const beforeSubtasks = template.templateSubtasks?.length
      ? template.templateSubtasks.map((s) => ({ ...s }))
      : [];

    const patch: Record<string, unknown> = {};
    if (dto.title !== undefined) patch.title = dto.title.trim() || template.title;
    if (dto.description !== undefined) {
      const trimmed = dto.description.trim();
      patch.description = trimmed.length ? trimmed : null;
    }
    if (dto.priority !== undefined) {
      patch.priority = dto.priority;
    }
    if (dto.assigneeIds !== undefined) {
      const ids = [...new Set(dto.assigneeIds.filter(Boolean))];
      patch.assigneeIds = ids.length ? ids : null;
      patch.assigneeId = ids[0] ?? null;
    }
    if (dto.recurrence) {
      patch.repeatType = dto.recurrence.repeat ?? template.repeatType;
      patch.ruleConfig = dto.recurrence as unknown as Record<string, unknown>;
      patch.createDaysBeforeDue = dto.recurrence.createDaysBeforeDue ?? template.createDaysBeforeDue ?? 0;
      patch.endType = dto.recurrence.endType ?? template.endType ?? 'NEVER';
      patch.endDate = dto.recurrence.endDate ? (dto.recurrence.endDate as unknown as Date) : null;
      patch.endAfterOccurrences = dto.recurrence.endAfterOccurrences ?? null;
    }
    if (dto.subtasks !== undefined) {
      patch.templateSubtasks =
        Array.isArray(dto.subtasks) && dto.subtasks.length === 0
          ? []
          : normalizeTemplateSubtasks(dto.subtasks);
    }
    await this.templatesRepository.update(template.id, patch as any);
    const updated = await this.templatesRepository.findById(template.id);
    if (!updated) throw new NotFoundException('Recurring template not found');

    const assigneesChanged = dto.assigneeIds !== undefined;
    const checklistChanged = dto.subtasks !== undefined;
    if (assigneesChanged || checklistChanged) {
      const syncedTaskIds = await this.syncPendingOccurrenceAssignmentsFromTemplate({
        beforeTemplate: template,
        afterTemplate: updated,
        actorUserId,
        syncAssignees: assigneesChanged,
        syncChecklist: checklistChanged,
      });

      // No open run to carry the assignment — still push for newly assigned people.
      if (syncedTaskIds.length === 0) {
        this.taskNotifications.scheduleTemplateAssignment({
          actorUserId,
          projectId: updated.projectId,
          templateId: updated.id,
          title: updated.title,
          beforeAssigneeIds,
          afterAssigneeIds: updated.assigneeIds?.length
            ? updated.assigneeIds
            : updated.assigneeId
              ? [updated.assigneeId]
              : [],
          beforeSubtasks,
          afterSubtasks: updated.templateSubtasks ?? [],
        });
      }
    }

    return updated;
  }

  /**
   * Mirror planner assignee / checklist assignee changes onto PENDING occurrence
   * tasks so current runs stay in sync and assignment pushes fire via scheduleOnUpdate.
   */
  private async syncPendingOccurrenceAssignmentsFromTemplate(params: {
    beforeTemplate: import('./entities/recurring-task-template.entity').RecurringTaskTemplateEntity;
    afterTemplate: import('./entities/recurring-task-template.entity').RecurringTaskTemplateEntity;
    actorUserId: string;
    syncAssignees: boolean;
    syncChecklist: boolean;
  }): Promise<string[]> {
    const { afterTemplate, actorUserId, syncAssignees, syncChecklist } = params;
    const occurrences = await this.occurrencesRepository.findByTemplate(afterTemplate.id);
    const pending = occurrences.filter((o) => o.state === 'PENDING' && !!o.taskId);
    const syncedTaskIds: string[] = [];

    for (const occurrence of pending) {
      const taskId = occurrence.taskId;
      if (!taskId) continue;
      const task = await this.tasksRepository.findById(taskId);
      if (!task) continue;

      const patch: Partial<TaskEntity> = {};
      if (syncAssignees) {
        const ids = afterTemplate.assigneeIds?.length
          ? [...afterTemplate.assigneeIds]
          : afterTemplate.assigneeId
            ? [afterTemplate.assigneeId]
            : [];
        patch.assigneeIds = ids.length ? ids : null;
        patch.assigneeId = ids[0] ?? null;
      }

      if (syncChecklist) {
        const templateSubs = afterTemplate.templateSubtasks ?? [];
        // Clearing the planner checklist must clear pending runs too.
        if (!templateSubs.length) {
          patch.subtasks = null;
        } else {
          const beforeSubs = params.beforeTemplate.templateSubtasks ?? [];
          const beforeById = new Map(
            beforeSubs
              .filter((s) => !!s?.id)
              .map((s) => [String(s.id), s] as const),
          );

          const existing = (task.subtasks ?? []).map((s) => ({ ...s }));
          const usedExisting = new Set<number>();
          const merged: NonNullable<TaskEntity['subtasks']> = [];

          for (const templateSub of templateSubs) {
            const titleKey = String(templateSub.title ?? '').trim().toLowerCase();
            const before = templateSub.id ? beforeById.get(String(templateSub.id)) : undefined;
            const beforeTitleKey = before
              ? String(before.title ?? '').trim().toLowerCase()
              : '';

            // Prefer current title, then previous template title (rename), then id.
            let matchIndex = existing.findIndex(
              (item, index) =>
                !usedExisting.has(index) &&
                String(item.title ?? '').trim().toLowerCase() === titleKey,
            );
            if (matchIndex < 0 && beforeTitleKey && beforeTitleKey !== titleKey) {
              matchIndex = existing.findIndex(
                (item, index) =>
                  !usedExisting.has(index) &&
                  String(item.title ?? '').trim().toLowerCase() === beforeTitleKey,
              );
            }
            if (matchIndex < 0 && templateSub.id) {
              matchIndex = existing.findIndex(
                (item, index) =>
                  !usedExisting.has(index) && String(item.id) === String(templateSub.id),
              );
            }

            const assigneeIds = templateSub.assigneeIds?.length
              ? [...templateSub.assigneeIds]
              : templateSub.assigneeId
                ? [templateSub.assigneeId]
                : [];

            if (matchIndex >= 0) {
              usedExisting.add(matchIndex);
              const current = existing[matchIndex];
              const next = {
                ...current,
                title: templateSub.title,
                ...(templateSub.dueTime ? { dueTime: templateSub.dueTime } : {}),
                ...(templateSub.notifyMinutesBefore != null
                  ? { notifyMinutesBefore: Number(templateSub.notifyMinutesBefore) }
                  : {}),
                ...(templateSub.priority ? { priority: templateSub.priority } : {}),
              } as NonNullable<TaskEntity['subtasks']>[number];
              delete next.assigneeId;
              delete next.assigneeIds;
              if (assigneeIds.length) {
                next.assigneeIds = assigneeIds;
                next.assigneeId = assigneeIds[0];
              }
              merged.push(next);
            } else {
              const runDueDate = task.dueDate ? String(task.dueDate).slice(0, 10) : nowYmd();
              const [cloned] = cloneTemplateSubtasksForOccurrence([templateSub], runDueDate);
              if (cloned) merged.push(cloned);
            }
          }

          // Template is the source of truth for checklist structure. Do not keep
          // unmatched run rows — that recreated deleted/renamed items as duplicates
          // when beforeTemplate no longer listed their old titles.
          patch.subtasks = merged.length ? merged : null;
        }
      }

      if (Object.keys(patch).length === 0) continue;
      await this.tasksRepository.update(task.id, patch as never);
      const refreshed = await this.tasksRepository.findById(task.id);
      if (!refreshed) continue;
      this.taskNotifications.scheduleOnUpdate(task, refreshed, actorUserId);
      syncedTaskIds.push(task.id);
    }

    return syncedTaskIds;
  }

  /**
   * Push title-only reminders for:
   * - the ritual itself (ruleConfig.dueTime) → all checklist assignees, ritual title
   * - each checklist item with its own dueTime → that item's assignees, item title
   * Lead time: each checklist item uses its own notifyMinutesBefore.
   * Ritual-level uses ruleConfig.notifyMinutesBefore (Asia/Kolkata wall clock).
   */
  async sendDueRitualReminders(now = new Date()): Promise<{ sent: number }> {
    const today = toYmd(now);
    const yesterday = subtractDays(today, 1);
    const tomorrow = subtractDays(today, -1);
    const nowMs = now.getTime();

    const occurrences = await this.occurrencesRepository.findPendingForReminders(
      yesterday,
      tomorrow,
    );
    if (!occurrences.length) return { sent: 0 };

    const templateCache = new Map<
      string,
      Awaited<ReturnType<RecurringTaskTemplatesRepository['findById']>>
    >();
    let sent = 0;

    for (const occurrence of occurrences) {
      if (!occurrence.taskId) continue;

      let template = templateCache.get(occurrence.templateId);
      if (template === undefined) {
        template = await this.templatesRepository.findById(occurrence.templateId);
        templateCache.set(occurrence.templateId, template);
      }
      if (!template || template.isPaused) continue;

      const rule = (template.ruleConfig ?? {}) as TaskRecurrenceDto;
      const seriesNotify =
        rule.notifyMinutesBefore == null || Number.isNaN(Number(rule.notifyMinutesBefore))
          ? null
          : Math.max(0, Math.min(24 * 60, Number(rule.notifyMinutesBefore)));

      const task = await this.tasksRepository.findById(occurrence.taskId);
      if (!task) continue;

      const runDueYmd = toYmd(new Date(occurrence.dueDate));
      const sentKeys = new Set(occurrence.remindersSent ?? []);
      // Legacy single-flag → treat ritual as already sent.
      if (occurrence.reminderSentAt && !sentKeys.has('ritual')) {
        sentKeys.add('ritual');
      }
      let keysChanged = false;

      const markSent = async (key: string) => {
        if (sentKeys.has(key)) return;
        sentKeys.add(key);
        keysChanged = true;
        sent += 1;
      };

      // 1) Ritual-level reminder → every checklist assignee, ritual title.
      const ritualDueTime = parseHHmm(rule.dueTime);
      if (seriesNotify != null && ritualDueTime && !sentKeys.has('ritual')) {
        if (isInRemindWindow(runDueYmd, ritualDueTime, seriesNotify, nowMs)) {
          const recipientIds = collectChecklistAssigneeIds(
            task.subtasks,
            template.templateSubtasks,
          );
          if (recipientIds.length) {
            const title = (task.title || template.title || 'Ritual').trim() || 'Ritual';
            await this.taskNotifications.notifyRitualDue({
              title,
              recipientIds,
              taskId: task.id,
              projectId: task.projectId,
              organizationId: task.organizationId,
              occurrenceId: occurrence.id,
              dueTime: ritualDueTime,
              notifyMinutesBefore: seriesNotify,
            });
          }
          await markSent('ritual');
        }
      }

      // 2) Per checklist item with its own due time → that item's assignees, item title.
      const subtasks = task.subtasks?.length
        ? task.subtasks
        : (template.templateSubtasks ?? []).map((s) => ({
            id: s.id,
            title: s.title,
            assigneeId: s.assigneeId,
            assigneeIds: s.assigneeIds,
            dueDate: undefined as string | undefined,
            dueTime: s.dueTime,
            notifyMinutesBefore: s.notifyMinutesBefore,
            completed: false,
          }));

      for (const subtask of subtasks) {
        const itemDueTime = parseHHmm(subtask.dueTime);
        if (!itemDueTime) continue;
        const key = `subtask:${subtask.id}`;
        if (sentKeys.has(key)) continue;

        const rawItemNotify = subtask.notifyMinutesBefore;
        const notifyMinutesBefore =
          rawItemNotify == null || Number.isNaN(Number(rawItemNotify))
            ? null
            : Math.max(0, Math.min(24 * 60, Number(rawItemNotify)));
        if (notifyMinutesBefore == null) continue;

        const itemDueYmd = subtask.dueDate
          ? String(subtask.dueDate).slice(0, 10)
          : runDueYmd;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(itemDueYmd)) continue;
        if (!isInRemindWindow(itemDueYmd, itemDueTime, notifyMinutesBefore, nowMs)) {
          continue;
        }

        const recipientIds = assigneeIdsForItem(subtask);
        if (recipientIds.length) {
          const title = (subtask.title || task.title || 'Checklist item').trim() || 'Checklist item';
          this.logger.log(
            `Checklist reminder due: "${title}" → ${recipientIds.length} assignee(s) (notify ${notifyMinutesBefore}m before ${itemDueYmd} ${itemDueTime})`,
          );
          await this.taskNotifications.notifyRitualDue({
            title,
            recipientIds,
            taskId: task.id,
            projectId: task.projectId,
            organizationId: task.organizationId,
            occurrenceId: occurrence.id,
            subtaskId: subtask.id,
            dueTime: itemDueTime,
            notifyMinutesBefore,
          });
        } else {
          this.logger.warn(
            `Checklist reminder skipped (no assignees): "${subtask.title}" @ ${itemDueYmd} ${itemDueTime}`,
          );
        }
        await markSent(key);
      }

      if (keysChanged) {
        await this.occurrencesRepository.update(occurrence.id, {
          remindersSent: Array.from(sentKeys),
          // Keep legacy stamp when ritual reminder has fired.
          ...(sentKeys.has('ritual') && !occurrence.reminderSentAt
            ? { reminderSentAt: now }
            : {}),
        });
      }
    }

    return { sent };
  }
}

function parseHHmm(raw?: string | null): string | null {
  if (!raw) return null;
  const t = String(raw).trim().slice(0, 5);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : null;
}

function isInRemindWindow(
  dueYmd: string,
  dueTime: string,
  notifyMinutesBefore: number,
  nowMs: number,
): boolean {
  const dueAtMs = Date.parse(`${dueYmd}T${dueTime}:00+05:30`);
  if (!Number.isFinite(dueAtMs)) return false;
  const remindAtMs = dueAtMs - notifyMinutesBefore * 60_000;
  // Fire from the remind moment until shortly after due.
  // Previously this was a 60s window — any delayed cron tick permanently missed the push.
  // Dedup is handled by occurrence.remindersSent keys, so a wider window is safe.
  const graceAfterDueMs = 2 * 60_000;
  return nowMs >= remindAtMs && nowMs < dueAtMs + graceAfterDueMs;
}

function assigneeIdsForItem(item: {
  assigneeId?: string | null;
  assigneeIds?: string[] | null;
}): string[] {
  const list =
    item.assigneeIds?.length
      ? item.assigneeIds
      : item.assigneeId
        ? [item.assigneeId]
        : [];
  return [
    ...new Set(list.map((id) => String(id ?? '').trim()).filter(Boolean)),
  ];
}

function collectChecklistAssigneeIds(
  taskSubtasks: TaskEntity['subtasks'] | null | undefined,
  templateSubtasks: RecurringTaskTemplateEntity['templateSubtasks'] | null | undefined,
): string[] {
  const ids = new Set<string>();
  const source =
    taskSubtasks?.length ? taskSubtasks : templateSubtasks?.length ? templateSubtasks : [];
  for (const item of source) {
    for (const id of assigneeIdsForItem(item)) ids.add(id);
  }
  return Array.from(ids);
}

