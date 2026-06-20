import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PlansRepository } from './repositories/plans.repository';
import { SubscriptionsRepository } from './repositories/subscriptions.repository';
import type { PlanEntity } from './entities/plan.entity';

export interface UsageBucket {
  current: number;
  limit: number | null;
}

export interface OrganizationUsage {
  users: UsageBucket;
  projects: UsageBucket;
  storageGb: UsageBucket;
  automations: UsageBucket;
  integrations: UsageBucket;
  apiKeys: UsageBucket;
}

export interface UsageCheckResult {
  allowed: boolean;
  resource: string;
  current: number;
  limit: number | null;
  message: string;
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    private readonly plansRepository: PlansRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private getPlanLimits(plan: PlanEntity | null): {
    maxUsers: number | null;
    maxProjects: number | null;
    storageLimitGb: number | null;
    automationLimit: number | null;
    integrationLimit: number | null;
    maxApiKeys: number | null;
  } {
    if (!plan) {
      return {
        maxUsers: 5,
        maxProjects: 1,
        storageLimitGb: 5,
        automationLimit: 0,
        integrationLimit: 0,
        maxApiKeys: 0,
      };
    }
    return {
      maxUsers: plan.maxUsers,
      maxProjects: plan.maxProjects,
      storageLimitGb: plan.storageLimitGb,
      automationLimit: plan.automationLimit,
      integrationLimit: plan.integrationLimit,
      maxApiKeys: plan.maxApiKeys ?? null,
    };
  }

  async getOrganizationUsage(organizationId: string): Promise<OrganizationUsage> {
    const subscription = await this.subscriptionsRepository.findByOrganization(organizationId);
    const plan = subscription?.plan || (subscription?.planId
      ? await this.plansRepository.findById(subscription.planId)
      : null);

    const limits = this.getPlanLimits(plan);

    // Check if trial expired → enforce free plan limits
    const isTrialExpired = subscription?.status === 'TRIAL' &&
      subscription.trialEndsAt && new Date(subscription.trialEndsAt) <= new Date();
    
    if (isTrialExpired) {
      const freePlan = await this.plansRepository.findBySlug('free');
      const freeLimits = this.getPlanLimits(freePlan);
      Object.assign(limits, freeLimits);
    }

    // Users count
    let usersCount = 0;
    try {
      const [result] = await this.dataSource.query(
        `SELECT COUNT(*) as cnt FROM organization_members WHERE organization_id = ? AND status = 'ACTIVE'`,
        [organizationId],
      );
      usersCount = Number(result?.cnt ?? 0);
    } catch { usersCount = 0; }

    // Projects count 
    let projectsCount = 0;
    try {
      const [result] = await this.dataSource.query(
        `SELECT COUNT(*) as cnt FROM projects WHERE organization_id = ?`,
        [organizationId],
      );
      projectsCount = Number(result?.cnt ?? 0);
    } catch { projectsCount = 0; }

    // Storage
    let storageGb = 0;
    try {
      const [result] = await this.dataSource.query(
        `SELECT COALESCE(SUM(bytes), 0) as total FROM (
           SELECT ta.file_size_bytes as bytes
           FROM task_attachments ta
           JOIN tasks t ON ta.task_id = t.id
           WHERE t.organization_id = ?
           UNION ALL
           SELECT a.file_size as bytes
           FROM attachments a
           WHERE a.workspace_id = ? AND (a.is_deleted = 0 OR a.is_deleted IS NULL)
         ) storage_union`,
        [organizationId, organizationId],
      );
      const totalBytes = Number(result?.total ?? 0);
      storageGb = Math.round((totalBytes / (1024 * 1024 * 1024)) * 100) / 100;
    } catch { storageGb = 0; }

    // Automations and Integrations — count from live tables when available
    let automationsUsed = 0;
    let integrationsUsed = 0;
    try {
      const [autoResult] = await this.dataSource.query(
        `SELECT COUNT(*) as cnt FROM automation_rules WHERE organization_id = ? AND is_enabled = 1`,
        [organizationId],
      );
      automationsUsed = Number(autoResult?.cnt ?? 0);
    } catch {
      try {
        const [result] = await this.dataSource.query(
          `SELECT automation_used FROM organization_usage WHERE organization_id = ?`,
          [organizationId],
        );
        automationsUsed = Number(result?.automation_used ?? 0);
      } catch { automationsUsed = 0; }
    }
    try {
      const [intResult] = await this.dataSource.query(
        `SELECT COUNT(*) as cnt FROM organization_integrations WHERE organization_id = ? AND is_active = 1`,
        [organizationId],
      );
      integrationsUsed = Number(intResult?.cnt ?? 0);
    } catch {
      try {
        const [result] = await this.dataSource.query(
          `SELECT integrations_used FROM organization_usage WHERE organization_id = ?`,
          [organizationId],
        );
        integrationsUsed = Number(result?.integrations_used ?? 0);
      } catch { integrationsUsed = 0; }
    }

    // API keys count from api_keys table
    let apiKeysCount = 0;
    try {
      const [result] = await this.dataSource.query(
        `SELECT COUNT(*) as cnt FROM api_keys WHERE organization_id = ?`,
        [organizationId],
      );
      apiKeysCount = Number(result?.cnt ?? 0);
    } catch { /* table might not exist yet */ }

    return {
      users: { current: usersCount, limit: limits.maxUsers },
      projects: { current: projectsCount, limit: limits.maxProjects },
      storageGb: { current: storageGb, limit: limits.storageLimitGb },
      automations: { current: automationsUsed, limit: limits.automationLimit },
      integrations: { current: integrationsUsed, limit: limits.integrationLimit },
      apiKeys: { current: apiKeysCount, limit: limits.maxApiKeys },
    };
  }

  async checkLimit(
    organizationId: string,
    resource: 'users' | 'projects' | 'storageGb' | 'automations' | 'integrations' | 'apiKeys',
    increment = 1,
  ): Promise<UsageCheckResult> {
    const usage = await this.getOrganizationUsage(organizationId);
    const bucket = usage[resource];

    if (bucket.limit === null) {
      return { allowed: true, resource, current: bucket.current, limit: null, message: '' };
    }

    const allowed = bucket.current + increment <= bucket.limit;

    const resourceNames: Record<string, string> = {
      users: 'team members',
      projects: 'projects',
      storageGb: 'storage',
      automations: 'automation runs',
      integrations: 'integrations',
      apiKeys: 'API keys',
    };

    return {
      allowed,
      resource,
      current: bucket.current,
      limit: bucket.limit,
      message: allowed
        ? ''
        : `You've reached the limit of ${bucket.limit} ${resourceNames[resource]} on your current plan. Upgrade to Pro for more.`,
    };
  }

  async getFeatureFlags(organizationId: string): Promise<Record<string, unknown>> {
    const subscription = await this.subscriptionsRepository.findByOrganization(organizationId);
    if (!subscription?.planId) return this.getDefaultFeatureFlags();

    // Check trial expiry
    const isTrialExpired = subscription.status === 'TRIAL' &&
      subscription.trialEndsAt && new Date(subscription.trialEndsAt) <= new Date();
    
    if (isTrialExpired) {
      return this.getDefaultFeatureFlags();
    }

    const plan = subscription.plan || await this.plansRepository.findById(subscription.planId);
    if (!plan) return this.getDefaultFeatureFlags();

    return {
      apiEnabled: plan.apiEnabled,
      ssoEnabled: plan.ssoEnabled,
      auditLogsEnabled: plan.auditLogsEnabled,
      customWorkflows: plan.customWorkflows,
      advancedReporting: plan.advancedReporting,
      timeTracking: plan.timeTracking,
      prioritySupport: plan.prioritySupport,
      ...plan.features,
    };
  }

  private getDefaultFeatureFlags(): Record<string, unknown> {
    return {
      apiEnabled: false,
      ssoEnabled: false,
      auditLogsEnabled: false,
      customWorkflows: false,
      advancedReporting: false,
      timeTracking: false,
      prioritySupport: false,
    };
  }
}
