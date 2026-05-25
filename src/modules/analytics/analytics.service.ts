import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLogEntity } from '../activity-logs/entities/activity-log.entity';
import { OrganizationMembersRepository } from '../organizations/repositories/organization-members.repository';
import { ProjectsRepository } from '../projects/repositories/projects.repository';
import { TasksRepository } from '../tasks/repositories/tasks.repository';
import { InvitationsService } from '../invitations/invitations.service';
import { BillingService } from '../billing/billing.service';

export interface OrgAnalyticsDto {
  totalMembers: number;
  totalProjects: number;
  totalTasks: number;
  activeMembers7d: number;
  activeMembers1d: number;
  activationRate: number;
  trialConversionPct: number | null;
  planDistribution: { plan: string; count: number; color: string }[];
  funnelCounts: Record<string, number>;
  currentPlan: string;
  subscriptionStatus: string;
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-muted',
  pro: 'bg-primary',
  team: 'bg-purple-500',
  enterprise: 'bg-amber-500',
};

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(ActivityLogEntity)
    private readonly activityLogsRepo: Repository<ActivityLogEntity>,
    private readonly orgMembersRepo: OrganizationMembersRepository,
    private readonly projectsRepo: ProjectsRepository,
    private readonly tasksRepo: TasksRepository,
    private readonly invitationsService: InvitationsService,
    private readonly billingService: BillingService,
  ) {}

  async getOrganizationAnalytics(organizationId: string): Promise<OrgAnalyticsDto> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const [
      totalMembers,
      totalProjects,
      totalTasks,
      activeMembers7d,
      activeMembers1d,
      invitationsCount,
      projectCreators,
      taskCreators,
      subscription,
    ] = await Promise.all([
      this.orgMembersRepo.countByOrganization(organizationId),
      this.projectsRepo.countByOrganization(organizationId),
      this.tasksRepo.countByOrganization(organizationId),
      this.countDistinctActiveUsers(organizationId, sevenDaysAgo),
      this.countDistinctActiveUsers(organizationId, oneDayAgo),
      this.invitationsService.listByOrganization(organizationId).then((inv) => inv.length),
      this.getDistinctUsersByActivity(organizationId, 'project', 'create'),
      this.getDistinctUsersByActivity(organizationId, 'task', 'create'),
      this.billingService.getSubscriptionForOrganization(organizationId),
    ]);

    const workspaceCompleted = projectCreators.filter((u) => taskCreators.includes(u)).length;
    const activationRate =
      totalMembers > 0 ? Math.round((projectCreators.length / totalMembers) * 100) : 0;

    let trialConversionPct: number | null = null;
    const plan = subscription?.plan ?? (subscription?.planId ? await this.billingService.getPlanById(subscription.planId) : null);
    if (subscription?.status === 'ACTIVE') {
      trialConversionPct = plan?.slug === 'free' ? 0 : 100;
    } else if (subscription?.status === 'TRIAL') {
      trialConversionPct = 0;
    }

    const planSlug = plan?.slug ?? 'free';
    const planDistribution = [{ plan: planSlug.charAt(0).toUpperCase() + planSlug.slice(1), count: 1, color: PLAN_COLORS[planSlug] ?? 'bg-muted' }];

    const funnelCounts: Record<string, number> = {
      signup: totalMembers,
      first_project_created : totalProjects > 0 ? totalProjects : projectCreators.length,
      invited_member: invitationsCount,
      first_task_created: totalTasks > 0 ? totalTasks : taskCreators.length,
      workspace_completed:
        totalProjects > 0 && totalTasks > 0
          ? totalMembers
          : workspaceCompleted,
    };

    return {
      totalMembers,
      totalProjects,
      totalTasks,
      activeMembers7d,
      activeMembers1d,
      activationRate,
      trialConversionPct,
      planDistribution,
      funnelCounts,
      currentPlan: planSlug,
      subscriptionStatus: subscription?.status ?? 'NONE',
    };
  }

  private async countDistinctActiveUsers(organizationId: string, since: Date): Promise<number> {
    const result = await this.activityLogsRepo
      .createQueryBuilder('a')
      .select('COUNT(DISTINCT a.userId)', 'count')
      .where('a.organizationId = :orgId', { orgId: organizationId })
      .andWhere('a.createdAt >= :since', { since })
      .andWhere('a.userId IS NOT NULL')
      .getRawOne<{ count: string }>();
    return parseInt(result?.count ?? '0', 10);
  }

  private async countActivityByType(
    organizationId: string,
    entityType: string,
    action: string,
  ): Promise<number> {
    return this.activityLogsRepo.count({
      where: { organizationId, entityType, action },
    });
  }

  private async getDistinctUsersByActivity(
    organizationId: string,
    entityType: string,
    action: string,
  ): Promise<string[]> {
    const rows = await this.activityLogsRepo
      .createQueryBuilder('a')
      .select('DISTINCT a.userId', 'userId')
      .where('a.organizationId = :orgId', { orgId: organizationId })
      .andWhere('a.entityType = :entityType', { entityType })
      .andWhere('a.action = :action', { action })
      .andWhere('a.userId IS NOT NULL')
      .getRawMany<{ userId: Buffer }>();
    return rows.map((r) => (r.userId as Buffer).toString('hex'));
  }
}
