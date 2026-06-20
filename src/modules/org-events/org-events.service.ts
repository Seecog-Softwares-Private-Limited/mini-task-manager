import { Injectable, Logger } from '@nestjs/common';
import { WebhooksService } from '../webhooks/webhooks.service';
import { AutomationsService } from '../automations/automations.service';
import { IntegrationsService } from '../integrations/integrations.service';

@Injectable()
export class OrgEventsService {
  private readonly logger = new Logger(OrgEventsService.name);

  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly automationsService: AutomationsService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  async taskCreated(params: {
    organizationId: string;
    projectId: string;
    taskId: string;
    title: string;
  }) {
    await this.safe(async () => {
      await this.webhooksService.dispatch(params.organizationId, 'task.created', params);
      await this.automationsService.processTaskEvent({
        organizationId: params.organizationId,
        projectId: params.projectId,
        taskId: params.taskId,
        trigger: 'task_created',
        context: {},
      });
      await this.integrationsService.notifySlack(
        params.organizationId,
        `New task created: *${params.title}*`,
        params,
      );
    });
  }

  async taskUpdated(params: {
    organizationId: string;
    projectId: string;
    taskId: string;
    title: string;
    changes: Record<string, unknown>;
  }) {
    await this.safe(async () => {
      await this.webhooksService.dispatch(params.organizationId, 'task.updated', params);
      const trigger = params.changes.statusId !== undefined ? 'status_change' : 'assignee_change';
      await this.automationsService.processTaskEvent({
        organizationId: params.organizationId,
        projectId: params.projectId,
        taskId: params.taskId,
        trigger,
        context: params.changes,
      });
      if (params.changes.assigneeId !== undefined) {
        await this.integrationsService.notifySlack(
          params.organizationId,
          `Task assigned: *${params.title}*`,
          params,
        );
      }
    });
  }

  async projectCreated(params: { organizationId: string; projectId: string; name: string }) {
    await this.safe(async () => {
      await this.webhooksService.dispatch(params.organizationId, 'project.created', params);
    });
  }

  async memberInvited(params: { organizationId: string; email: string }) {
    await this.safe(async () => {
      await this.webhooksService.dispatch(params.organizationId, 'member.invited', params);
    });
  }

  private async safe(fn: () => Promise<void>) {
    try {
      await fn();
    } catch (err) {
      this.logger.warn(`Org event handler failed: ${String(err)}`);
    }
  }
}
