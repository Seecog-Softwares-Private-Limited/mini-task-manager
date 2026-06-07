import { Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
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
import {
  computeNextRecurringDueDate,
  shouldStopRecurrence,
  subtractDays,
  toYmd,
} from './recurrence.util';

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
  constructor(
    private readonly templatesRepository: RecurringTaskTemplatesRepository,
    private readonly occurrencesRepository: RecurringTaskOccurrencesRepository,
    private readonly tasksRepository: TasksRepository,
    @Inject(forwardRef(() => TasksService))
    private readonly tasksService: TasksService,
  ) {}

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

  async generateDueOccurrences(today = nowYmd()): Promise<{ generated: number }> {
    let generated = 0;
    const dueTemplates = await this.templatesRepository.findDueTemplates(today);
    for (const template of dueTemplates) {
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
            template.projectId,
            template.organizationId,
            template.createdBy,
            {
              projectId: template.projectId,
              organizationId: template.organizationId,
              title: template.title,
              description: template.description ?? undefined,
              statusId: template.statusId ?? undefined,
              priority: template.priority,
              assigneeId: template.assigneeId ?? undefined,
              assigneeIds: template.assigneeIds ?? undefined,
              dueDate: nextDueDate,
              storyPoints: template.storyPoints ?? undefined,
              tags: template.tags ?? undefined,
              subtasks: template.templateSubtasks ?? undefined,
            },
          );
          await this.tasksRepository.update(createdTask.id, {
            recurringTemplateId: template.id,
            recurrenceType: template.repeatType,
            recurrenceSequence: nextSequence,
          } as never);
          await this.occurrencesRepository.create({
            templateId: template.id,
            organizationId: template.organizationId,
            projectId: template.projectId,
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
    }
    return { generated };
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

