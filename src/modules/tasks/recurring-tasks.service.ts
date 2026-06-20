import { Inject, Injectable, Logger, NotFoundException, forwardRef } from '@nestjs/common';
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
import { ProjectsRepository } from '../projects/repositories/projects.repository';
import type { TaskEntity } from './entities/task.entity';
import { generateUuid } from '../../common/utils/uuid.util';
import {
  computeNextRecurringDueDate,
  shouldStopRecurrence,
  subtractDays,
  toYmd,
} from './recurrence.util';

type TemplateSubtask = NonNullable<
  import('./entities/recurring-task-template.entity').RecurringTaskTemplateEntity['templateSubtasks']
>[number];

function cloneTemplateSubtasksForOccurrence(
  templateSubtasks: import('./entities/recurring-task-template.entity').RecurringTaskTemplateEntity['templateSubtasks'],
): NonNullable<TaskEntity['subtasks']> {
  if (!templateSubtasks?.length) return [];
  return templateSubtasks.map((s: TemplateSubtask) => ({
    id: generateUuid(),
    title: s.title,
    completed: false,
    description: s.description,
    assigneeId: s.assigneeId,
    dueDate: s.dueDate,
    status: 'TODO' as const,
    priority: s.priority,
    statusId: s.statusId,
  }));
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
    recurrence: TaskRecurrenceDto;
  }): Promise<void> {
    const repeat = params.recurrence.repeat ?? 'NONE';
    if (repeat === 'NONE') return;

    const dueDate = params.dueDate ?? nowYmd();
    const nextDueDate = computeNextRecurringDueDate(dueDate, dueDate, params.recurrence);
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
      templateSubtasks: params.subtasks?.length ? (params.subtasks as any) : null,
      tags: params.tags?.length ? params.tags : null,
      repeatType: repeat,
      ruleConfig: params.recurrence as unknown as Record<string, unknown>,
      createDaysBeforeDue: params.recurrence.createDaysBeforeDue ?? 0,
      startDueDate: dueDate as unknown as Date,
      nextDueDate: nextDueDate as unknown as Date,
      lastGeneratedDueDate: dueDate as unknown as Date,
      lastSequence: 1,
      generatedCount: 1,
      endType: params.recurrence.endType ?? 'NEVER',
      endDate: params.recurrence.endDate ? (params.recurrence.endDate as unknown as Date) : null,
      endAfterOccurrences: params.recurrence.endAfterOccurrences ?? null,
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
      if (!existing) {
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
            subtasks: cloneTemplateSubtasksForOccurrence(template.templateSubtasks),
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

  /** True when occurrence points at a missing/deleted task row. */
  private async isOccurrenceTaskMissing(
    occurrence: import('./entities/recurring-task-occurrence.entity').RecurringTaskOccurrenceEntity,
  ): Promise<boolean> {
    if (!occurrence.taskId) return true;
    const task = await this.tasksRepository.findById(occurrence.taskId);
    return !task;
  }

  /** Repair missing task links, materialize overdue occurrences, and fix metadata for board display. */
  async syncBoardTasks(organizationId: string, projectId: string): Promise<{ materialized: number; repaired: number }> {
    await this.generateDueOccurrences(nowYmd(), { organizationId, projectId });
    const templates = await this.templatesRepository.findByOrganization(organizationId, projectId);
    const templateMap = new Map(templates.map((t) => [t.id, t]));
    const pending = await this.occurrencesRepository.findPendingByProject(organizationId, projectId);
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

      const taskMissing = await this.isOccurrenceTaskMissing(occ);
      let task = !taskMissing && occ.taskId
        ? await this.tasksRepository.findByIdAndOrganization(occ.taskId, organizationId)
        : null;

      if (!task) {
        if (occ.taskId && taskMissing) {
          await this.occurrencesRepository.update(occ.id, { taskId: null });
        }
        const ok = await this.materializeOccurrence(occ, template);
        if (ok) materialized += 1;
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

    const tasks = await this.tasksRepository.findRecurringByProject(projectId, organizationId);
    for (const task of tasks) {
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
          subtasks: cloneTemplateSubtasksForOccurrence(template.templateSubtasks),
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
  ): Promise<{ tasks: import('./entities/task.entity').TaskEntity[]; overdueTaskIds: string[] }> {
    await this.syncBoardTasks(organizationId, projectId);
    const today = nowYmd();
    const pending = await this.occurrencesRepository.findPendingByProject(organizationId, projectId);
    const templates = await this.templatesRepository.findByOrganization(organizationId, projectId);
    const templateMap = new Map(templates.map((t) => [t.id, t]));
    const overdueTaskIds: string[] = [];
    const statusIdSet = new Set(validStatusIds.filter(Boolean));
    const fallbackStatusId = validStatusIds[0];

    for (const occ of pending) {
      const dueYmd = String(occ.dueDate).slice(0, 10);
      if (dueYmd >= today) continue;
      const template = await this.resolveTemplateForOccurrence(
        occ,
        templateMap,
        organizationId,
        projectId,
      );
      if (!template) continue;

      let taskId = occ.taskId;
      const taskMissing = await this.isOccurrenceTaskMissing(occ);
      if (taskId && taskMissing) {
        await this.occurrencesRepository.update(occ.id, { taskId: null });
        taskId = null;
      }
      if (taskId) {
        const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
        if (!task) {
          await this.materializeOccurrence(occ, template);
          taskId = (await this.occurrencesRepository.findById(occ.id))?.taskId ?? null;
        }
      } else {
        await this.materializeOccurrence(occ, template);
        taskId = (await this.occurrencesRepository.findById(occ.id))?.taskId ?? null;
      }
      if (taskId) {
        const linked = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
        if (linked) overdueTaskIds.push(taskId);
      }
    }

    const tasks = await this.mergeBoardTasks(projectId, organizationId, overdueTaskIds);

    if (statusIdSet.size > 0 && fallbackStatusId) {
      for (const task of tasks) {
        if (task.statusId && !statusIdSet.has(task.statusId)) {
          await this.tasksRepository.update(task.id, { statusId: fallbackStatusId });
          task.statusId = fallbackStatusId;
        }
      }
    }

    return {
      tasks,
      overdueTaskIds: [...new Set(overdueTaskIds)],
    };
  }

  private async mergeBoardTasks(
    projectId: string,
    organizationId: string,
    overdueTaskIds: string[],
  ): Promise<import('./entities/task.entity').TaskEntity[]> {
    const tasks = await this.tasksRepository.findRecurringByProject(projectId, organizationId);
    const byId = new Map(tasks.map((t) => [t.id, t]));
    for (const taskId of overdueTaskIds) {
      if (byId.has(taskId)) continue;
      const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
      if (task) byId.set(task.id, task);
    }
    return [...byId.values()];
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
          storyPoints: template.storyPoints ?? undefined,
          tags: template.tags ?? undefined,
          subtasks: cloneTemplateSubtasksForOccurrence(template.templateSubtasks),
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

  async listTemplates(organizationId: string, query: RecurringTasksQueryDto) {
    const templates = await this.templatesRepository.findByOrganization(organizationId, query.projectId);
    const items: Array<{
      id: string;
      title: string;
      repeatType: string;
      nextDueDate: Date;
      isPaused: boolean;
      generatedCount: number;
      upcoming: number;
      completed: number;
      endType: string;
      createDaysBeforeDue: number;
    }> = [];
    for (const tpl of templates) {
      const history = await this.occurrencesRepository.findByTemplate(tpl.id);
      const upcoming = history.filter((h) => h.state === 'PENDING').length;
      const completed = history.filter((h) => h.state === 'COMPLETED').length;
      items.push({
        id: tpl.id,
        title: tpl.title,
        repeatType: tpl.repeatType,
        nextDueDate: tpl.nextDueDate,
        isPaused: tpl.isPaused,
        generatedCount: tpl.generatedCount,
        upcoming,
        completed,
        endType: tpl.endType,
        createDaysBeforeDue: tpl.createDaysBeforeDue,
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
    await this.templatesRepository.update(template.id, { isPaused: true });
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
    await this.templatesRepository.delete(template.id);
    return { success: true };
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

    const subtasks = cloneTemplateSubtasksForOccurrence(template.templateSubtasks);
    await this.tasksRepository.update(task.id, { subtasks } as never);
    const refreshed = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
    if (!refreshed) throw new NotFoundException('Recurring task not found');
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

  async updateTemplate(templateId: string, organizationId: string, dto: UpdateRecurringTemplateDto) {
    const template = await this.templatesRepository.findByIdAndOrganization(templateId, organizationId);
    if (!template) throw new NotFoundException('Recurring template not found');
    const patch: Record<string, unknown> = {};
    if (dto.title !== undefined) patch.title = dto.title.trim() || template.title;
    if (dto.recurrence) {
      patch.repeatType = dto.recurrence.repeat ?? template.repeatType;
      patch.ruleConfig = dto.recurrence as unknown as Record<string, unknown>;
      patch.createDaysBeforeDue = dto.recurrence.createDaysBeforeDue ?? template.createDaysBeforeDue ?? 0;
      patch.endType = dto.recurrence.endType ?? template.endType ?? 'NEVER';
      patch.endDate = dto.recurrence.endDate ? (dto.recurrence.endDate as unknown as Date) : null;
      patch.endAfterOccurrences = dto.recurrence.endAfterOccurrences ?? null;
    }
    await this.templatesRepository.update(template.id, patch as any);
    return this.templatesRepository.findById(template.id);
  }
}

