import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';
import { WebhooksRepository } from './webhooks.repository';
import { UsageService } from '../billing/usage.service';
import { OrganizationsService } from '../organizations/organizations.service';

export const WEBHOOK_EVENTS = [
  'project.created',
  'task.created',
  'task.updated',
  'member.invited',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly webhooksRepository: WebhooksRepository,
    private readonly usageService: UsageService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async list(organizationId: string, userId: string) {
    await this.assertAccess(organizationId, userId);
    const hooks = await this.webhooksRepository.findByOrganization(organizationId);
    return hooks.map((h) => ({
      id: h.id,
      name: h.name,
      url: h.url,
      events: h.eventsJson,
      isActive: h.isActive,
      createdAt: h.createdAt,
    }));
  }

  async create(
    organizationId: string,
    userId: string,
    data: { name: string; url: string; events: string[] },
  ) {
    await this.assertAccess(organizationId, userId);
    const flags = await this.usageService.getFeatureFlags(organizationId);
    if (!flags.apiEnabled) {
      throw new ForbiddenException('Webhooks require a plan with API access.');
    }
    const secret = crypto.randomBytes(24).toString('hex');
    const hook = await this.webhooksRepository.create({
      organizationId,
      name: data.name.trim().slice(0, 120),
      url: data.url.trim(),
      secret,
      eventsJson: data.events.filter((e) => WEBHOOK_EVENTS.includes(e as WebhookEvent)),
      isActive: true,
      createdBy: userId,
    });
    return { ...hook, secret };
  }

  async remove(organizationId: string, userId: string, id: string) {
    await this.assertAccess(organizationId, userId);
    const hook = await this.webhooksRepository.findById(id);
    if (!hook || hook.organizationId !== organizationId) {
      throw new NotFoundException('Webhook not found');
    }
    await this.webhooksRepository.delete(id, organizationId);
  }

  async dispatch(organizationId: string, event: WebhookEvent, payload: Record<string, unknown>) {
    const hooks = await this.webhooksRepository.findActiveForEvent(organizationId, event);
    await Promise.all(
      hooks.map(async (hook) => {
        try {
          const body = JSON.stringify({ event, organizationId, payload, sentAt: new Date().toISOString() });
          const signature = crypto.createHmac('sha256', hook.secret).update(body).digest('hex');
          await fetch(hook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-MTM-Signature': signature,
              'X-MTM-Event': event,
            },
            body,
          });
        } catch (err) {
          this.logger.warn(`Webhook delivery failed for ${hook.id}: ${String(err)}`);
        }
      }),
    );
  }

  private async assertAccess(organizationId: string, userId: string) {
    const ok = await this.organizationsService.canAccess(organizationId, userId);
    if (!ok) throw new ForbiddenException('Access denied');
  }
}
