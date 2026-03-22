/**
 * Database seed: creates users, org, plans, subscription, project, workflow, tasks, etc.
 * Run: npm run seed (from repo root)
 * Loads env from properties.env at repo root.
 *
 * Login after seed:
 *   admin@example.com  / <SEED_USER_PASSWORD or Password123!>  (project ADMIN — can send invites)
 *   owner@example.com  / <SEED_USER_PASSWORD or Password123!>
 *   member@example.com / <SEED_USER_PASSWORD or Password123!>
 * (Select the seeded organization "Seed Org" in the app to see projects/tasks.)
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), 'properties.env') });

import { DataSource } from 'typeorm';
import { configuration } from '../../../config/configuration';
import { generateUuid } from '../../../common/utils/uuid.util';
import { UserEntity } from '../../../modules/users/entities/user.entity';
import { OrganizationEntity } from '../../../modules/organizations/entities/organization.entity';
import { OrganizationMemberEntity } from '../../../modules/organizations/entities/organization-member.entity';
import { PlanEntity } from '../../../modules/billing/entities/plan.entity';
import { SubscriptionEntity } from '../../../modules/billing/entities/subscription.entity';
import { ProjectEntity } from '../../../modules/projects/entities/project.entity';
import { WorkflowEntity } from '../../../modules/workflows/entities/workflow.entity';
import { WorkflowStatusEntity } from '../../../modules/workflows/entities/workflow-status.entity';
import { TaskEntity } from '../../../modules/tasks/entities/task.entity';
import { SprintEntity } from '../../../modules/sprints/entities/sprint.entity';
import { NotificationEntity } from '../../../modules/notifications/entities/notification.entity';
import { ActivityLogEntity } from '../../../modules/activity-logs/entities/activity-log.entity';
import { ProjectMemberEntity } from '../../../modules/projects/entities/project-member.entity';

const PASSWORD = process.env.SEED_USER_PASSWORD || 'Password123!';
const OWNER_EMAIL = 'owner@example.com';
const MEMBER_EMAIL = 'member@example.com';
const ADMIN_EMAIL = 'admin@example.com';

async function runSeed() {
  const dbConfig = configuration().database;
  const dataSource = new DataSource({
    type: 'mysql',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    entities: [
      UserEntity,
      OrganizationEntity,
      OrganizationMemberEntity,
      PlanEntity,
      SubscriptionEntity,
      ProjectEntity,
      ProjectMemberEntity,
      WorkflowEntity,
      WorkflowStatusEntity,
      TaskEntity,
      SprintEntity,
      NotificationEntity,
      ActivityLogEntity,
    ],
    synchronize: false,
    logging: dbConfig.logging ?? false,
  });

  await dataSource.initialize();
  console.log('Database connected. Running seed...');

  await dataSource.transaction(async (manager) => {
    const userRepo = manager.getRepository(UserEntity);
    const orgRepo = manager.getRepository(OrganizationEntity);
    const orgMemberRepo = manager.getRepository(OrganizationMemberEntity);
    const planRepo = manager.getRepository(PlanEntity);
    const subRepo = manager.getRepository(SubscriptionEntity);
    const projectRepo = manager.getRepository(ProjectEntity);
    const projectMemberRepo = manager.getRepository(ProjectMemberEntity);
    const workflowRepo = manager.getRepository(WorkflowEntity);
    const workflowStatusRepo = manager.getRepository(WorkflowStatusEntity);
    const taskRepo = manager.getRepository(TaskEntity);
    const sprintRepo = manager.getRepository(SprintEntity);
    const notificationRepo = manager.getRepository(NotificationEntity);
    const activityLogRepo = manager.getRepository(ActivityLogEntity);

    // 1. Users (find or create — idempotent)
    let owner = await userRepo.findOne({ where: { email: OWNER_EMAIL } });
    let member = await userRepo.findOne({ where: { email: MEMBER_EMAIL } });
    let admin = await userRepo.findOne({ where: { email: ADMIN_EMAIL } });

    if (!owner) {
      const ownerId = generateUuid();
      owner = await userRepo.save(
        userRepo.create({
          id: ownerId,
          email: OWNER_EMAIL,
          fullName: 'Seed Owner',
          passwordHash: PASSWORD,
          isEmailVerified: true,
        }),
      );
    } else {
      await userRepo.update(owner.id, { passwordHash: PASSWORD, isEmailVerified: true });
    }
    if (!member) {
      const memberId = generateUuid();
      member = await userRepo.save(
        userRepo.create({
          id: memberId,
          email: MEMBER_EMAIL,
          fullName: 'Seed Member',
          passwordHash: PASSWORD,
          isEmailVerified: true,
        }),
      );
    } else {
      await userRepo.update(member.id, { passwordHash: PASSWORD, isEmailVerified: true });
    }
    if (!admin) {
      const adminId = generateUuid();
      admin = await userRepo.save(
        userRepo.create({
          id: adminId,
          email: ADMIN_EMAIL,
          fullName: 'Seed Admin',
          passwordHash: PASSWORD,
          isEmailVerified: true,
        }),
      );
    } else {
      await userRepo.update(admin.id, { passwordHash: PASSWORD, isEmailVerified: true });
    }

    const ownerId = owner.id;
    const memberId = member.id;
    const adminId = admin.id;
    console.log('  Users ready (owner@example.com, member@example.com, admin@example.com)');

    // 2. Organization
    const orgId = generateUuid();
    const slug = 'seed-org-' + Date.now();
    await orgRepo.save(
      orgRepo.create({
        id: orgId,
        name: 'Seed Org',
        slug,
        ownerId,
      }),
    );
    console.log('  Organization created: Seed Org');

    // 3. Organization members (owner, member, admin)
    await orgMemberRepo.save(
      orgMemberRepo.create({
        id: generateUuid(),
        organizationId: orgId,
        userId: ownerId,
        role: 'owner',
        status: 'ACTIVE',
      }),
    );
    await orgMemberRepo.save(
      orgMemberRepo.create({
        id: generateUuid(),
        organizationId: orgId,
        userId: memberId,
        role: 'member',
        status: 'ACTIVE',
      }),
    );
    await orgMemberRepo.save(
      orgMemberRepo.create({
        id: generateUuid(),
        organizationId: orgId,
        userId: adminId,
        role: 'admin',
        status: 'ACTIVE',
      }),
    );
    console.log('  Organization members: owner + member + admin');

    // 4. Plans (Free, Starter, Pro, Enterprise) — find or create
    let planFree = await planRepo.findOne({ where: { slug: 'free' } });
    let planStarter = await planRepo.findOne({ where: { slug: 'starter' } });
    let planPro = await planRepo.findOne({ where: { slug: 'pro' } });
    let planEnt = await planRepo.findOne({ where: { slug: 'enterprise' } });

    if (!planFree) {
      const planFreeId = generateUuid();
      planFree = await planRepo.save(
      planRepo.create({
        id: planFreeId,
        slug: 'free',
        name: 'Free',
        priceMonthly: 0,
        priceYearly: 0,
        currency: 'INR',
        billingCycle: 'monthly',
        maxProjects: 1,
        maxUsers: 3,
        storageLimitGb: 5,
        automationLimit: 0,
        integrationLimit: 0,
        apiEnabled: false,
        ssoEnabled: false,
        auditLogsEnabled: false,
        customWorkflows: false,
        advancedReporting: false,
        timeTracking: false,
        prioritySupport: false,
        slaUptime: null,
        features: { customFields: false, sso: false },
        isActive: true,
        isPopular: false,
        displayOrder: 1,
      }),
    );
    }
    if (!planStarter) {
      const planStarterId = generateUuid();
      planStarter = await planRepo.save(
      planRepo.create({
        id: planStarterId,
        slug: 'starter',
        name: 'Starter',
        priceMonthly: 5,
        priceYearly: 50,
        currency: 'INR',
        billingCycle: 'monthly',
        maxProjects: 10,
        maxUsers: 10,
        storageLimitGb: 5,
        automationLimit: 50,
        integrationLimit: 5,
        apiEnabled: true,
        ssoEnabled: false,
        auditLogsEnabled: false,
        customWorkflows: true,
        advancedReporting: false,
        timeTracking: false,
        prioritySupport: false,
        slaUptime: null,
        features: { customFields: true, sso: false },
        isActive: true,
        isPopular: false,
        displayOrder: 2,
      }),
    );
    }
    if (!planPro) {
      const planProId = generateUuid();
      planPro = await planRepo.save(
      planRepo.create({
        id: planProId,
        slug: 'pro',
        name: 'Pro',
        priceMonthly: 349,
        priceYearly: 3499,
        currency: 'INR',
        billingCycle: 'monthly',
        maxProjects: null,
        maxUsers: null,
        storageLimitGb: 100,
        automationLimit: 500,
        integrationLimit: 10,
        apiEnabled: true,
        ssoEnabled: true,
        auditLogsEnabled: false,
        customWorkflows: true,
        advancedReporting: true,
        timeTracking: true,
        prioritySupport: false,
        slaUptime: null,
        features: { customFields: true, sso: true },
        isActive: true,
        isPopular: true,
        displayOrder: 3,
      }),
    );
    }
    if (!planEnt) {
      const planEntId = generateUuid();
      planEnt = await planRepo.save(
      planRepo.create({
        id: planEntId,
        slug: 'enterprise',
        name: 'Enterprise',
        priceMonthly: 799,
        priceYearly: 7999,
        currency: 'INR',
        billingCycle: 'monthly',
        maxProjects: null,
        maxUsers: null,
        storageLimitGb: null,
        automationLimit: null,
        integrationLimit: null,
        apiEnabled: true,
        ssoEnabled: true,
        auditLogsEnabled: true,
        customWorkflows: true,
        advancedReporting: true,
        timeTracking: true,
        prioritySupport: true,
        slaUptime: '99.9%',
        features: { customFields: true, sso: true, auditLog: true, prioritySupport: true },
        isActive: true,
        isPopular: false,
        displayOrder: 4,
      }),
    );
    }
    const planFreeId = planFree.id;
    const planStarterId = planStarter.id;
    const planProId = planPro.id;
    const planEntId = planEnt.id;
    console.log('  Plans: Free, Starter, Pro, Enterprise');

    // 5. Subscription (org on Free)
    await subRepo.save(
      subRepo.create({
        id: generateUuid(),
        organizationId: orgId,
        planId: planFreeId,
        status: 'ACTIVE',
        startDate: new Date(),
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      }),
    );
    console.log('  Subscription: Seed Org on Free (trial)');

    // 6. Project
    const projectId = generateUuid();
    await projectRepo.save(
      projectRepo.create({
        id: projectId,
        organizationId: orgId,
        createdBy: ownerId,
        name: 'Seed Project',
        description: 'Created by seed',
        visibility: 'PRIVATE',
        isArchived: false,
      }),
    );
    console.log('  Project: Seed Project');

    // 6b. Project members (owner=ADMIN, member=VIEWER, admin=ADMIN — admin can send invites)
    await projectMemberRepo.save(
      projectMemberRepo.create({
        id: generateUuid(),
        projectId,
        userId: ownerId,
        role: 'ADMIN',
      }),
    );
    await projectMemberRepo.save(
      projectMemberRepo.create({
        id: generateUuid(),
        projectId,
        userId: memberId,
        role: 'VIEWER',
      }),
    );
    await projectMemberRepo.save(
      projectMemberRepo.create({
        id: generateUuid(),
        projectId,
        userId: adminId,
        role: 'ADMIN',
      }),
    );
    console.log('  Project members: owner (ADMIN), member (VIEWER), admin (ADMIN)');

    // 7. Workflow + statuses
    const workflowId = generateUuid();
    await workflowRepo.save(
      workflowRepo.create({
        id: workflowId,
        projectId,
        name: 'Default',
        isDefault: true,
      }),
    );
    const statusTodoId = generateUuid();
    const statusProgressId = generateUuid();
    const statusDoneId = generateUuid();
    await workflowStatusRepo.save(
      workflowStatusRepo.create({
        id: statusTodoId,
        workflowId,
        name: 'To Do',
        position: 0,
        type: 'TODO',
      }),
    );
    await workflowStatusRepo.save(
      workflowStatusRepo.create({
        id: statusProgressId,
        workflowId,
        name: 'In Progress',
        position: 1,
        type: 'IN_PROGRESS',
      }),
    );
    await workflowStatusRepo.save(
      workflowStatusRepo.create({
        id: statusDoneId,
        workflowId,
        name: 'Done',
        position: 2,
        type: 'DONE',
      }),
    );
    console.log('  Workflow + statuses: To Do, In Progress, Done');

    // 8. Tasks (with statusId so Kanban works)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    await taskRepo.save(
      taskRepo.create({
        id: generateUuid(),
        projectId,
        organizationId: orgId,
        reporterId: ownerId,
        title: 'Welcome task',
        description: 'First task from seed',
        statusId: statusTodoId,
        priority: 'MEDIUM',
        assigneeIds: [ownerId],
        subtasks: [
          {
            id: generateUuid(),
            title: 'Review onboarding checklist',
            completed: true,
            assigneeId: ownerId,
            priority: 'LOW',
            dueDate: tomorrow,
          },
          {
            id: generateUuid(),
            title: 'Set initial priorities',
            completed: false,
            assigneeId: memberId,
            priority: 'MEDIUM',
            dueDate: inThreeDays,
          },
        ],
      }),
    );
    await taskRepo.save(
      taskRepo.create({
        id: generateUuid(),
        projectId,
        organizationId: orgId,
        reporterId: ownerId,
        assigneeId: ownerId,
        assigneeIds: [ownerId, adminId],
        title: 'Second task',
        statusId: statusProgressId,
        priority: 'HIGH',
        subtasks: [
          {
            id: generateUuid(),
            title: 'Confirm API contracts',
            completed: false,
            assigneeId: adminId,
            priority: 'HIGH',
            dueDate: tomorrow,
          },
          {
            id: generateUuid(),
            title: 'Ship first board polish',
            completed: false,
            assigneeId: ownerId,
            priority: 'CRITICAL',
            dueDate: inThreeDays,
          },
        ],
      }),
    );
    console.log('  Tasks: 2 tasks in To Do / In Progress');

    // 9. Sprint (optional)
    const sprintId = generateUuid();
    await sprintRepo.save(
      sprintRepo.create({
        id: sprintId,
        projectId,
        name: 'Sprint 1',
        status: 'PLANNED',
      }),
    );
    console.log('  Sprint: Sprint 1');

    // 10. Notifications
    await notificationRepo.save(
      notificationRepo.create({
        id: generateUuid(),
        userId: ownerId,
        title: 'Welcome',
        message: 'Seed notification',
        isRead: false,
      }),
    );
    console.log('  Notifications: 1 for owner');

    // 11. Activity log
    await activityLogRepo.save(
      activityLogRepo.create({
        id: generateUuid(),
        organizationId: orgId,
        userId: ownerId,
        entityType: 'project',
        entityId: projectId,
        action: 'create',
        metadata: { name: 'Seed Project' },
      }),
    );
    console.log('  Activity log: 1 entry');
  });

  await dataSource.destroy();
  console.log('\nSeed completed successfully.');
  console.log('\nLogin credentials:');
  console.log('  owner@example.com  / Password123!  (org owner, project ADMIN)');
  console.log('  admin@example.com  / Password123!  (org admin, project ADMIN — can send invites)');
  console.log('  member@example.com / Password123! (org member, project VIEWER)');
  console.log('\nAfter login, select organization "Seed Org" to see the project and tasks.');
}

runSeed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
