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
var PlanSeedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanSeedService = void 0;
const common_1 = require("@nestjs/common");
const plans_repository_1 = require("./repositories/plans.repository");
const uuid_util_1 = require("../../common/utils/uuid.util");
let PlanSeedService = PlanSeedService_1 = class PlanSeedService {
    constructor(plansRepository) {
        this.plansRepository = plansRepository;
        this.logger = new common_1.Logger(PlanSeedService_1.name);
    }
    async onModuleInit() {
        await this.seedPlans();
    }
    async seedPlans() {
        const existingPlans = await this.plansRepository.findAll();
        const plans = [
            {
                id: existingPlans.find(p => p.slug === 'free')?.id || (0, uuid_util_1.generateUuid)(),
                slug: 'free',
                name: 'Free',
                priceMonthly: 0,
                priceYearly: 0,
                currency: 'INR',
                maxUsers: 5,
                maxProjects: 1,
                storageLimitGb: 5,
                automationLimit: 0,
                integrationLimit: 0,
                maxApiKeys: 0,
                apiEnabled: false,
                ssoEnabled: false,
                auditLogsEnabled: false,
                customWorkflows: false,
                advancedReporting: false,
                timeTracking: false,
                prioritySupport: false,
                slaUptime: null,
                features: {
                    kanbanBoard: true,
                    scrumBoard: false,
                    basicReporting: true,
                    customFields: false,
                    timeTracking: false,
                    roleBasedPermissions: false,
                },
                isActive: true,
                displayOrder: 1,
                isPopular: false,
            },
            {
                id: existingPlans.find(p => p.slug === 'pro')?.id || (0, uuid_util_1.generateUuid)(),
                slug: 'pro',
                name: 'Pro',
                priceMonthly: 349,
                priceYearly: 3499,
                currency: 'INR',
                maxUsers: null,
                maxProjects: null,
                storageLimitGb: 100,
                automationLimit: 500,
                integrationLimit: 10,
                maxApiKeys: 10,
                apiEnabled: true,
                ssoEnabled: false,
                auditLogsEnabled: false,
                customWorkflows: true,
                advancedReporting: true,
                timeTracking: true,
                prioritySupport: false,
                slaUptime: null,
                features: {
                    kanbanBoard: true,
                    scrumBoard: true,
                    basicReporting: true,
                    customFields: true,
                    timeTracking: true,
                    roleBasedPermissions: true,
                    automation: true,
                    apiAccess: true,
                },
                isActive: true,
                displayOrder: 2,
                isPopular: true,
            },
            {
                id: existingPlans.find(p => p.slug === 'enterprise')?.id || (0, uuid_util_1.generateUuid)(),
                slug: 'enterprise',
                name: 'Enterprise',
                priceMonthly: 799,
                priceYearly: 7999,
                currency: 'INR',
                maxUsers: null,
                maxProjects: null,
                storageLimitGb: null,
                automationLimit: null,
                integrationLimit: null,
                maxApiKeys: null,
                apiEnabled: true,
                ssoEnabled: true,
                auditLogsEnabled: true,
                customWorkflows: true,
                advancedReporting: true,
                timeTracking: true,
                prioritySupport: true,
                slaUptime: '99.9%',
                features: {
                    kanbanBoard: true,
                    scrumBoard: true,
                    basicReporting: true,
                    customFields: true,
                    timeTracking: true,
                    roleBasedPermissions: true,
                    automation: true,
                    apiAccess: true,
                    sso: true,
                    auditLogs: true,
                    dedicatedManager: true,
                    customSecurity: true,
                    dataExport: true,
                    advancedRbac: true,
                },
                isActive: true,
                displayOrder: 3,
                isPopular: false,
            },
        ];
        for (const planData of plans) {
            try {
                await this.plansRepository.upsert(planData);
                this.logger.log(`Plan seeded/updated: ${planData.name} (${planData.slug})`);
            }
            catch (error) {
                this.logger.warn(`Failed to upsert plan ${planData.slug}, trying save...`);
                try {
                    const existing = await this.plansRepository.findBySlug(planData.slug);
                    if (existing) {
                        Object.assign(existing, planData, { id: existing.id });
                        await this.plansRepository.save(existing);
                    }
                    else {
                        await this.plansRepository.save(planData);
                    }
                    this.logger.log(`Plan saved: ${planData.name}`);
                }
                catch (err2) {
                    this.logger.error(`Failed to seed plan ${planData.slug}`, err2);
                }
            }
        }
        this.logger.log('Plan seeding complete');
    }
};
exports.PlanSeedService = PlanSeedService;
exports.PlanSeedService = PlanSeedService = PlanSeedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [plans_repository_1.PlansRepository])
], PlanSeedService);
//# sourceMappingURL=plan-seed.service.js.map