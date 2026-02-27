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
var UsageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const plans_repository_1 = require("./repositories/plans.repository");
const subscriptions_repository_1 = require("./repositories/subscriptions.repository");
let UsageService = UsageService_1 = class UsageService {
    constructor(plansRepository, subscriptionsRepository, dataSource) {
        this.plansRepository = plansRepository;
        this.subscriptionsRepository = subscriptionsRepository;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(UsageService_1.name);
    }
    getPlanLimits(plan) {
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
    async getOrganizationUsage(organizationId) {
        const subscription = await this.subscriptionsRepository.findByOrganization(organizationId);
        const plan = subscription?.plan || (subscription?.planId
            ? await this.plansRepository.findById(subscription.planId)
            : null);
        const limits = this.getPlanLimits(plan);
        const isTrialExpired = subscription?.status === 'TRIAL' &&
            subscription.trialEndsAt && new Date(subscription.trialEndsAt) <= new Date();
        if (isTrialExpired) {
            const freePlan = await this.plansRepository.findBySlug('free');
            const freeLimits = this.getPlanLimits(freePlan);
            Object.assign(limits, freeLimits);
        }
        let usersCount = 0;
        try {
            const [result] = await this.dataSource.query(`SELECT COUNT(*) as cnt FROM organization_members WHERE organization_id = ? AND status = 'ACTIVE'`, [organizationId]);
            usersCount = Number(result?.cnt ?? 0);
        }
        catch {
            usersCount = 0;
        }
        let projectsCount = 0;
        try {
            const [result] = await this.dataSource.query(`SELECT COUNT(*) as cnt FROM projects WHERE organization_id = ?`, [organizationId]);
            projectsCount = Number(result?.cnt ?? 0);
        }
        catch {
            projectsCount = 0;
        }
        let storageGb = 0;
        try {
            const [result] = await this.dataSource.query(`SELECT COALESCE(SUM(ta.file_size_bytes), 0) as total
         FROM task_attachments ta
         JOIN tasks t ON ta.task_id = t.id
         WHERE t.organization_id = ?`, [organizationId]);
            const totalBytes = Number(result?.total ?? 0);
            storageGb = Math.round((totalBytes / (1024 * 1024 * 1024)) * 100) / 100;
        }
        catch {
            storageGb = 0;
        }
        let automationsUsed = 0;
        let integrationsUsed = 0;
        try {
            const [result] = await this.dataSource.query(`SELECT automation_used, integrations_used FROM organization_usage WHERE organization_id = ?`, [organizationId]);
            automationsUsed = Number(result?.automation_used ?? 0);
            integrationsUsed = Number(result?.integrations_used ?? 0);
        }
        catch { }
        let apiKeysCount = 0;
        try {
            const [result] = await this.dataSource.query(`SELECT COUNT(*) as cnt FROM api_keys WHERE organization_id = ?`, [organizationId]);
            apiKeysCount = Number(result?.cnt ?? 0);
        }
        catch { }
        return {
            users: { current: usersCount, limit: limits.maxUsers },
            projects: { current: projectsCount, limit: limits.maxProjects },
            storageGb: { current: storageGb, limit: limits.storageLimitGb },
            automations: { current: automationsUsed, limit: limits.automationLimit },
            integrations: { current: integrationsUsed, limit: limits.integrationLimit },
            apiKeys: { current: apiKeysCount, limit: limits.maxApiKeys },
        };
    }
    async checkLimit(organizationId, resource, increment = 1) {
        const usage = await this.getOrganizationUsage(organizationId);
        const bucket = usage[resource];
        if (bucket.limit === null) {
            return { allowed: true, resource, current: bucket.current, limit: null, message: '' };
        }
        const allowed = bucket.current + increment <= bucket.limit;
        const resourceNames = {
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
    async getFeatureFlags(organizationId) {
        const subscription = await this.subscriptionsRepository.findByOrganization(organizationId);
        if (!subscription?.planId)
            return this.getDefaultFeatureFlags();
        const isTrialExpired = subscription.status === 'TRIAL' &&
            subscription.trialEndsAt && new Date(subscription.trialEndsAt) <= new Date();
        if (isTrialExpired) {
            return this.getDefaultFeatureFlags();
        }
        const plan = subscription.plan || await this.plansRepository.findById(subscription.planId);
        if (!plan)
            return this.getDefaultFeatureFlags();
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
    getDefaultFeatureFlags() {
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
};
exports.UsageService = UsageService;
exports.UsageService = UsageService = UsageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [plans_repository_1.PlansRepository,
        subscriptions_repository_1.SubscriptionsRepository,
        typeorm_2.DataSource])
], UsageService);
//# sourceMappingURL=usage.service.js.map