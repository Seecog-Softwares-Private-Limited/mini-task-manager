import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PlansRepository } from './repositories/plans.repository';
import { generateUuid } from '../../common/utils/uuid.util';

@Injectable()
export class PlanSeedService implements OnModuleInit {
  private readonly logger = new Logger(PlanSeedService.name);

  constructor(private readonly plansRepository: PlansRepository) {}

  async onModuleInit() {
    await this.seedPlans();
  }

  async seedPlans() {
    const existingPlans = await this.plansRepository.findAll();
    
    const plans = [
      {
        id: existingPlans.find(p => p.slug === 'free')?.id || generateUuid(),
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
        id: existingPlans.find(p => p.slug === 'pro')?.id || generateUuid(),
        slug: 'pro',
        name: 'Pro',
        priceMonthly: 349,
        priceYearly: 3499,
        currency: 'INR',
        maxUsers: null, // Unlimited
        maxProjects: null, // Unlimited
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
        id: existingPlans.find(p => p.slug === 'enterprise')?.id || generateUuid(),
        slug: 'enterprise',
        name: 'Enterprise',
        priceMonthly: 799,
        priceYearly: 7999,
        currency: 'INR',
        maxUsers: null,
        maxProjects: null,
        storageLimitGb: null, // Unlimited
        automationLimit: null, // Unlimited
        integrationLimit: null, // Unlimited
        maxApiKeys: null, // Unlimited
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
        await this.plansRepository.upsert(planData as any);
        this.logger.log(`Plan seeded/updated: ${planData.name} (${planData.slug})`);
      } catch (error) {
        this.logger.warn(`Failed to upsert plan ${planData.slug}, trying save...`);
        try {
          const existing = await this.plansRepository.findBySlug(planData.slug);
          if (existing) {
            Object.assign(existing, planData, { id: existing.id });
            await this.plansRepository.save(existing);
          } else {
            await this.plansRepository.save(planData as any);
          }
          this.logger.log(`Plan saved: ${planData.name}`);
        } catch (err2) {
          this.logger.error(`Failed to seed plan ${planData.slug}`, err2);
        }
      }
    }

    this.logger.log('Plan seeding complete');
  }
}
