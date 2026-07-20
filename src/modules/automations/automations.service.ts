import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AutomationsRepository } from './automations.repository';
import { UsageService } from '../billing/usage.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TasksRepository } from '../tasks/repositories/tasks.repository';

export type AutomationTrigger =
  | 'status_change'
  | 'assignee_change'
  | 'due_date_passed'
  | 'task_created';

export type AutomationAction = 'notify' | 'assign' | 'set_status' | 'add_comment' | 'move_status';

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(
    private readonly automationsRepository: AutomationsRepository,
    private readonly usageService: UsageService,
    private readonly organizationsService: OrganizationsService,
    private readonly notificationsService: NotificationsService,
    private readonly tasksRepository: TasksRepository,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async list(organizationId: string, userId: string) {
    await this.assertAccess(organizationId, userId);
    return this.automationsRepository.findByOrganization(organizationId);
  }

  async create(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      projectId?: string;
      triggerType: AutomationTrigger;
      triggerConfig?: Record<string, unknown>;
      actionType: AutomationAction;
      actionConfig: Record<string, unknown>;
    },
  ) {
    await this.assertAccess(organizationId, userId);
    const check = await this.usageService.checkLimit(organizationId, 'automations', 1);
    if (!check.allowed) {
      throw new ForbiddenException(check.message || 'Automation limit reached.');
    }
    const rule = await this.automationsRepository.create({
      organizationId,
      projectId: data.projectId ?? null,
      name: data.name.trim().slice(0, 120),
      triggerType: data.triggerType,
      triggerConfigJson: data.triggerConfig ?? null,
      actionType: data.actionType,
      actionConfigJson: data.actionConfig,
      isEnabled: true,
      createdBy: userId,
    });
    await this.incrementAutomationUsed(organizationId);
    return rule;
  }

  async remove(organizationId: string, userId: string, id: string) {
    await this.assertAccess(organizationId, userId);
    await this.automationsRepository.delete(id, organizationId);
    await this.syncAutomationCount(organizationId);
  }

  async processTaskEvent(params: {
    organizationId: string;
    projectId: string;
    taskId: string;
    trigger: AutomationTrigger;
    context: Record<string, unknown>;
  }) {
    const rules = await this.automationsRepository.findMatching(
      params.organizationId,
      params.trigger,
      params.projectId,
    );
    for (const rule of rules) {
      if (!this.matchesTrigger(rule.triggerConfigJson, params.context)) continue;
      try {
        await this.runAction(rule, params);
      } catch (err) {
        this.logger.warn(`Automation ${rule.id} failed: ${String(err)}`);
      }
    }
  }

  private matchesTrigger(
    config: Record<string, unknown> | null,
    context: Record<string, unknown>,
  ): boolean {
    if (!config) return true;
    for (const [key, value] of Object.entries(config)) {
      if (context[key] !== value) return false;
    }
    return true;
  }

  private async runAction(
    rule: { actionType: string; actionConfigJson: Record<string, unknown> },
    params: { organizationId: string; taskId: string; context: Record<string, unknown> },
  ) {
    const cfg = rule.actionConfigJson;
    switch (rule.actionType as AutomationAction) {
      case 'notify': {
        const userId = String(cfg.userId ?? params.context.assigneeId ?? '');
        if (!userId) return;
        await this.notificationsService.createNotification(
          userId,
          String(cfg.title ?? 'Automation notification'),
          String(cfg.body ?? 'A task automation ran.'),
        );
        break;
      }
      case 'assign': {
        const assigneeId = String(cfg.assigneeId ?? '');
        if (!assigneeId) return;
        const before = await this.tasksRepository.findById(params.taskId);
        await this.tasksRepository.update(params.taskId, {
          assigneeId,
          assigneeIds: [assigneeId],
        } as never);
        const after = await this.tasksRepository.findById(params.taskId);
        if (before && after) {
          const title = after.title || 'Task';
          await this.notificationsService.createNotification(
            assigneeId,
            `Task assigned: ${title}`,
            `An automation assigned you to "${title}".`,
            {
              type: 'task_assigned',
              taskId: after.id,
              projectId: after.projectId,
              open: 'alerts',
            },
          );
        }
        break;
      }
      case 'set_status':
      case 'move_status': {
        const statusId = String(cfg.statusId ?? '');
        if (!statusId) return;
        await this.tasksRepository.update(params.taskId, { statusId });
        break;
      }
      case 'add_comment':
        break;
      default:
        break;
    }
  }

  private async incrementAutomationUsed(organizationId: string) {
    await this.dataSource.query(
      `INSERT INTO organization_usage (organization_id, automation_used, integrations_used)
       VALUES (?, 1, 0)
       ON DUPLICATE KEY UPDATE automation_used = automation_used + 1`,
      [organizationId],
    );
  }

  private async syncAutomationCount(organizationId: string) {
    const count = await this.automationsRepository.countByOrganization(organizationId);
    await this.dataSource.query(
      `INSERT INTO organization_usage (organization_id, automation_used, integrations_used)
       VALUES (?, ?, 0)
       ON DUPLICATE KEY UPDATE automation_used = ?`,
      [organizationId, count, count],
    );
  }

  private async assertAccess(organizationId: string, userId: string) {
    const ok = await this.organizationsService.canAccess(organizationId, userId);
    if (!ok) throw new NotFoundException('Access denied');
  }
}
