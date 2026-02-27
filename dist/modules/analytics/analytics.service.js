"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const activity_log_entity_1 = require("../activity-logs/entities/activity-log.entity");
const organization_members_repository_1 = require("../organizations/repositories/organization-members.repository");
const projects_repository_1 = require("../projects/repositories/projects.repository");
const tasks_repository_1 = require("../tasks/repositories/tasks.repository");
const invitations_service_1 = require("../invitations/invitations.service");
const billing_service_1 = require("../billing/billing.service");
const PLAN_COLORS = {
    free: 'bg-muted',
    pro: 'bg-primary',
    team: 'bg-purple-500',
    enterprise: 'bg-amber-500',
};
let AnalyticsService = class AnalyticsService {
    constructor(activityLogsRepo, orgMembersRepo, projectsRepo, tasksRepo, invitationsService, billingService) {
        this.activityLogsRepo = activityLogsRepo;
        this.orgMembersRepo = orgMembersRepo;
        this.projectsRepo = projectsRepo;
        this.tasksRepo = tasksRepo;
        this.invitationsService = invitationsService;
        this.billingService = billingService;
    }
    async getOrganizationAnalytics(organizationId) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const [totalMembers, totalProjects, totalTasks, activeMembers7d, activeMembers1d, invitationsCount, projectCreators, taskCreators, subscription,] = await Promise.all([
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
        const activationRate = totalMembers > 0 ? Math.round((projectCreators.length / totalMembers) * 100) : 0;
        let trialConversionPct = null;
        const plan = subscription?.plan ?? (subscription?.planId ? await this.billingService.getPlanById(subscription.planId) : null);
        if (subscription?.status === 'ACTIVE') {
            trialConversionPct = plan?.slug === 'free' ? 0 : 100;
        }
        else if (subscription?.status === 'TRIAL') {
            trialConversionPct = 0;
        }
        const planSlug = plan?.slug ?? 'free';
        const planDistribution = [{ plan: planSlug.charAt(0).toUpperCase() + planSlug.slice(1), count: 1, color: PLAN_COLORS[planSlug] ?? 'bg-muted' }];
        const funnelCounts = {
            signup: totalMembers,
            first_project_created: projectCreators.length,
            invited_member: invitationsCount,
            first_task_created: taskCreators.length,
            workspace_completed: workspaceCompleted,
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
    async countDistinctActiveUsers(organizationId, since) {
        const result = await this.activityLogsRepo
            .createQueryBuilder('a')
            .select('COUNT(DISTINCT a.userId)', 'count')
            .where('a.organizationId = :orgId', { orgId: organizationId })
            .andWhere('a.createdAt >= :since', { since })
            .andWhere('a.userId IS NOT NULL')
            .getRawOne();
        return parseInt(result?.count ?? '0', 10);
    }
    async countActivityByType(organizationId, entityType, action) {
        return this.activityLogsRepo.count({
            where: { organizationId, entityType, action },
        });
    }
    async getDistinctUsersByActivity(organizationId, entityType, action) {
        const rows = await this.activityLogsRepo
            .createQueryBuilder('a')
            .select('DISTINCT a.userId', 'userId')
            .where('a.organizationId = :orgId', { orgId: organizationId })
            .andWhere('a.entityType = :entityType', { entityType })
            .andWhere('a.action = :action', { action })
            .andWhere('a.userId IS NOT NULL')
            .getRawMany();
        return rows.map((r) => r.userId.toString('hex'));
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(activity_log_entity_1.ActivityLogEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        organization_members_repository_1.OrganizationMembersRepository,
        projects_repository_1.ProjectsRepository,
        tasks_repository_1.TasksRepository,
        invitations_service_1.InvitationsService,
        billing_service_1.BillingService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map