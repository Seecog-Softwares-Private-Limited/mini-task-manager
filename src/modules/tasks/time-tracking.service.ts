import { ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { TaskTimeEntriesRepository } from './repositories/task-time-entries.repository';
import { TasksRepository } from './repositories/tasks.repository';
import { UsageService } from '../billing/usage.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { isMissingDbTableError } from '../../common/utils/db-error.util';

@Injectable()
export class TimeTrackingService {
  constructor(
    private readonly timeEntriesRepository: TaskTimeEntriesRepository,
    private readonly tasksRepository: TasksRepository,
    private readonly usageService: UsageService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async listForTask(organizationId: string, taskId: string, userId: string) {
    await this.assertAccess(organizationId, userId);
    const task = await this.tasksRepository.findById(taskId);
    if (!task || task.organizationId !== organizationId) {
      throw new NotFoundException('Task not found');
    }
    return this.findEntriesForTask(taskId);
  }

  async logTime(
    organizationId: string,
    taskId: string,
    userId: string,
    data: { minutes: number; note?: string; loggedAt?: string },
  ) {
    await this.assertAccess(organizationId, userId);
    const flags = await this.usageService.getFeatureFlags(organizationId);
    if (!flags.timeTracking) {
      throw new ForbiddenException('Time tracking is not available on your current plan.');
    }
    const task = await this.tasksRepository.findById(taskId);
    if (!task || task.organizationId !== organizationId) {
      throw new NotFoundException('Task not found');
    }
    const minutes = Math.max(1, Math.floor(data.minutes));
    try {
      const entry = await this.timeEntriesRepository.create({
        taskId,
        organizationId,
        userId,
        minutes,
        note: data.note?.trim().slice(0, 500) ?? null,
        loggedAt: data.loggedAt ? new Date(data.loggedAt) : new Date(),
      });
      const total = await this.timeEntriesRepository.sumMinutesByTask(taskId);
      await this.tasksRepository.update(taskId, { loggedMinutes: total });
      return entry;
    } catch (err) {
      if (isMissingDbTableError(err, 'task_time_entries')) {
        throw new ServiceUnavailableException(
          'Time tracking is not ready yet. Run database migrations and restart the API.',
        );
      }
      throw err;
    }
  }

  private async findEntriesForTask(taskId: string) {
    try {
      return await this.timeEntriesRepository.findByTask(taskId);
    } catch (err) {
      if (isMissingDbTableError(err, 'task_time_entries')) return [];
      throw err;
    }
  }

  private async assertAccess(organizationId: string, userId: string) {
    const ok = await this.organizationsService.canAccess(organizationId, userId);
    if (!ok) throw new ForbiddenException('Access denied');
  }
}
