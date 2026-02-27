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
    planDistribution: {
        plan: string;
        count: number;
        color: string;
    }[];
    funnelCounts: Record<string, number>;
    currentPlan: string;
    subscriptionStatus: string;
}
export declare class AnalyticsService {
    private readonly activityLogsRepo;
    private readonly orgMembersRepo;
    private readonly projectsRepo;
    private readonly tasksRepo;
    private readonly invitationsService;
    private readonly billingService;
    constructor(activityLogsRepo: Repository<ActivityLogEntity>, orgMembersRepo: OrganizationMembersRepository, projectsRepo: ProjectsRepository, tasksRepo: TasksRepository, invitationsService: InvitationsService, billingService: BillingService);
    getOrganizationAnalytics(organizationId: string): Promise<OrgAnalyticsDto>;
    private countDistinctActiveUsers;
    private countActivityByType;
    private getDistinctUsersByActivity;
}
