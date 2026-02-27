"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const bcrypt = require("bcrypt");
const configuration_1 = require("../../../config/configuration");
const uuid_util_1 = require("../../../common/utils/uuid.util");
const user_entity_1 = require("../../../modules/users/entities/user.entity");
const organization_entity_1 = require("../../../modules/organizations/entities/organization.entity");
const organization_member_entity_1 = require("../../../modules/organizations/entities/organization-member.entity");
const plan_entity_1 = require("../../../modules/billing/entities/plan.entity");
const subscription_entity_1 = require("../../../modules/billing/entities/subscription.entity");
const project_entity_1 = require("../../../modules/projects/entities/project.entity");
const workflow_entity_1 = require("../../../modules/workflows/entities/workflow.entity");
const workflow_status_entity_1 = require("../../../modules/workflows/entities/workflow-status.entity");
const task_entity_1 = require("../../../modules/tasks/entities/task.entity");
const sprint_entity_1 = require("../../../modules/sprints/entities/sprint.entity");
const notification_entity_1 = require("../../../modules/notifications/entities/notification.entity");
const activity_log_entity_1 = require("../../../modules/activity-logs/entities/activity-log.entity");
const project_member_entity_1 = require("../../../modules/projects/entities/project-member.entity");
const PASSWORD = process.env.SEED_USER_PASSWORD || 'Password123!';
const OWNER_EMAIL = 'owner@example.com';
const MEMBER_EMAIL = 'member@example.com';
const ADMIN_EMAIL = 'admin@example.com';
async function runSeed() {
    const dbConfig = (0, configuration_1.configuration)().database;
    const dataSource = new typeorm_1.DataSource({
        type: 'mysql',
        host: dbConfig.host,
        port: dbConfig.port,
        username: dbConfig.username,
        password: dbConfig.password,
        database: dbConfig.database,
        entities: [
            user_entity_1.UserEntity,
            organization_entity_1.OrganizationEntity,
            organization_member_entity_1.OrganizationMemberEntity,
            plan_entity_1.PlanEntity,
            subscription_entity_1.SubscriptionEntity,
            project_entity_1.ProjectEntity,
            project_member_entity_1.ProjectMemberEntity,
            workflow_entity_1.WorkflowEntity,
            workflow_status_entity_1.WorkflowStatusEntity,
            task_entity_1.TaskEntity,
            sprint_entity_1.SprintEntity,
            notification_entity_1.NotificationEntity,
            activity_log_entity_1.ActivityLogEntity,
        ],
        synchronize: false,
        logging: dbConfig.logging ?? false,
    });
    await dataSource.initialize();
    console.log('Database connected. Running seed...');
    const hash = await bcrypt.hash(PASSWORD, 10);
    await dataSource.transaction(async (manager) => {
        const userRepo = manager.getRepository(user_entity_1.UserEntity);
        const orgRepo = manager.getRepository(organization_entity_1.OrganizationEntity);
        const orgMemberRepo = manager.getRepository(organization_member_entity_1.OrganizationMemberEntity);
        const planRepo = manager.getRepository(plan_entity_1.PlanEntity);
        const subRepo = manager.getRepository(subscription_entity_1.SubscriptionEntity);
        const projectRepo = manager.getRepository(project_entity_1.ProjectEntity);
        const projectMemberRepo = manager.getRepository(project_member_entity_1.ProjectMemberEntity);
        const workflowRepo = manager.getRepository(workflow_entity_1.WorkflowEntity);
        const workflowStatusRepo = manager.getRepository(workflow_status_entity_1.WorkflowStatusEntity);
        const taskRepo = manager.getRepository(task_entity_1.TaskEntity);
        const sprintRepo = manager.getRepository(sprint_entity_1.SprintEntity);
        const notificationRepo = manager.getRepository(notification_entity_1.NotificationEntity);
        const activityLogRepo = manager.getRepository(activity_log_entity_1.ActivityLogEntity);
        let owner = await userRepo.findOne({ where: { email: OWNER_EMAIL } });
        let member = await userRepo.findOne({ where: { email: MEMBER_EMAIL } });
        let admin = await userRepo.findOne({ where: { email: ADMIN_EMAIL } });
        if (!owner) {
            const ownerId = (0, uuid_util_1.generateUuid)();
            owner = await userRepo.save(userRepo.create({
                id: ownerId,
                email: OWNER_EMAIL,
                fullName: 'Seed Owner',
                passwordHash: hash,
                isEmailVerified: true,
            }));
        }
        else {
            await userRepo.update(owner.id, { passwordHash: hash, isEmailVerified: true });
        }
        if (!member) {
            const memberId = (0, uuid_util_1.generateUuid)();
            member = await userRepo.save(userRepo.create({
                id: memberId,
                email: MEMBER_EMAIL,
                fullName: 'Seed Member',
                passwordHash: hash,
                isEmailVerified: true,
            }));
        }
        else {
            await userRepo.update(member.id, { passwordHash: hash, isEmailVerified: true });
        }
        if (!admin) {
            const adminId = (0, uuid_util_1.generateUuid)();
            admin = await userRepo.save(userRepo.create({
                id: adminId,
                email: ADMIN_EMAIL,
                fullName: 'Seed Admin',
                passwordHash: hash,
                isEmailVerified: true,
            }));
        }
        else {
            await userRepo.update(admin.id, { passwordHash: hash, isEmailVerified: true });
        }
        const ownerId = owner.id;
        const memberId = member.id;
        const adminId = admin.id;
        console.log('  Users ready (owner@example.com, member@example.com, admin@example.com)');
        const orgId = (0, uuid_util_1.generateUuid)();
        const slug = 'seed-org-' + Date.now();
        await orgRepo.save(orgRepo.create({
            id: orgId,
            name: 'Seed Org',
            slug,
            ownerId,
        }));
        console.log('  Organization created: Seed Org');
        await orgMemberRepo.save(orgMemberRepo.create({
            id: (0, uuid_util_1.generateUuid)(),
            organizationId: orgId,
            userId: ownerId,
            role: 'owner',
            status: 'ACTIVE',
        }));
        await orgMemberRepo.save(orgMemberRepo.create({
            id: (0, uuid_util_1.generateUuid)(),
            organizationId: orgId,
            userId: memberId,
            role: 'member',
            status: 'ACTIVE',
        }));
        await orgMemberRepo.save(orgMemberRepo.create({
            id: (0, uuid_util_1.generateUuid)(),
            organizationId: orgId,
            userId: adminId,
            role: 'admin',
            status: 'ACTIVE',
        }));
        console.log('  Organization members: owner + member + admin');
        let planFree = await planRepo.findOne({ where: { slug: 'free' } });
        let planStarter = await planRepo.findOne({ where: { slug: 'starter' } });
        let planPro = await planRepo.findOne({ where: { slug: 'pro' } });
        let planEnt = await planRepo.findOne({ where: { slug: 'enterprise' } });
        if (!planFree) {
            const planFreeId = (0, uuid_util_1.generateUuid)();
            planFree = await planRepo.save(planRepo.create({
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
            }));
        }
        if (!planStarter) {
            const planStarterId = (0, uuid_util_1.generateUuid)();
            planStarter = await planRepo.save(planRepo.create({
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
            }));
        }
        if (!planPro) {
            const planProId = (0, uuid_util_1.generateUuid)();
            planPro = await planRepo.save(planRepo.create({
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
            }));
        }
        if (!planEnt) {
            const planEntId = (0, uuid_util_1.generateUuid)();
            planEnt = await planRepo.save(planRepo.create({
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
            }));
        }
        const planFreeId = planFree.id;
        const planStarterId = planStarter.id;
        const planProId = planPro.id;
        const planEntId = planEnt.id;
        console.log('  Plans: Free, Starter, Pro, Enterprise');
        await subRepo.save(subRepo.create({
            id: (0, uuid_util_1.generateUuid)(),
            organizationId: orgId,
            planId: planFreeId,
            status: 'ACTIVE',
            startDate: new Date(),
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        }));
        console.log('  Subscription: Seed Org on Free (trial)');
        const projectId = (0, uuid_util_1.generateUuid)();
        await projectRepo.save(projectRepo.create({
            id: projectId,
            organizationId: orgId,
            createdBy: ownerId,
            name: 'Seed Project',
            description: 'Created by seed',
            visibility: 'PRIVATE',
            isArchived: false,
        }));
        console.log('  Project: Seed Project');
        await projectMemberRepo.save(projectMemberRepo.create({
            id: (0, uuid_util_1.generateUuid)(),
            projectId,
            userId: ownerId,
            role: 'ADMIN',
        }));
        await projectMemberRepo.save(projectMemberRepo.create({
            id: (0, uuid_util_1.generateUuid)(),
            projectId,
            userId: memberId,
            role: 'VIEWER',
        }));
        await projectMemberRepo.save(projectMemberRepo.create({
            id: (0, uuid_util_1.generateUuid)(),
            projectId,
            userId: adminId,
            role: 'ADMIN',
        }));
        console.log('  Project members: owner (ADMIN), member (VIEWER), admin (ADMIN)');
        const workflowId = (0, uuid_util_1.generateUuid)();
        await workflowRepo.save(workflowRepo.create({
            id: workflowId,
            projectId,
            name: 'Default',
            isDefault: true,
        }));
        const statusTodoId = (0, uuid_util_1.generateUuid)();
        const statusProgressId = (0, uuid_util_1.generateUuid)();
        const statusDoneId = (0, uuid_util_1.generateUuid)();
        await workflowStatusRepo.save(workflowStatusRepo.create({
            id: statusTodoId,
            workflowId,
            name: 'To Do',
            position: 0,
            type: 'TODO',
        }));
        await workflowStatusRepo.save(workflowStatusRepo.create({
            id: statusProgressId,
            workflowId,
            name: 'In Progress',
            position: 1,
            type: 'IN_PROGRESS',
        }));
        await workflowStatusRepo.save(workflowStatusRepo.create({
            id: statusDoneId,
            workflowId,
            name: 'Done',
            position: 2,
            type: 'DONE',
        }));
        console.log('  Workflow + statuses: To Do, In Progress, Done');
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);
        await taskRepo.save(taskRepo.create({
            id: (0, uuid_util_1.generateUuid)(),
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
                    id: (0, uuid_util_1.generateUuid)(),
                    title: 'Review onboarding checklist',
                    completed: true,
                    assigneeId: ownerId,
                    priority: 'LOW',
                    dueDate: tomorrow,
                },
                {
                    id: (0, uuid_util_1.generateUuid)(),
                    title: 'Set initial priorities',
                    completed: false,
                    assigneeId: memberId,
                    priority: 'MEDIUM',
                    dueDate: inThreeDays,
                },
            ],
        }));
        await taskRepo.save(taskRepo.create({
            id: (0, uuid_util_1.generateUuid)(),
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
                    id: (0, uuid_util_1.generateUuid)(),
                    title: 'Confirm API contracts',
                    completed: false,
                    assigneeId: adminId,
                    priority: 'HIGH',
                    dueDate: tomorrow,
                },
                {
                    id: (0, uuid_util_1.generateUuid)(),
                    title: 'Ship first board polish',
                    completed: false,
                    assigneeId: ownerId,
                    priority: 'CRITICAL',
                    dueDate: inThreeDays,
                },
            ],
        }));
        console.log('  Tasks: 2 tasks in To Do / In Progress');
        const sprintId = (0, uuid_util_1.generateUuid)();
        await sprintRepo.save(sprintRepo.create({
            id: sprintId,
            projectId,
            name: 'Sprint 1',
            status: 'PLANNED',
        }));
        console.log('  Sprint: Sprint 1');
        await notificationRepo.save(notificationRepo.create({
            id: (0, uuid_util_1.generateUuid)(),
            userId: ownerId,
            title: 'Welcome',
            message: 'Seed notification',
            isRead: false,
        }));
        console.log('  Notifications: 1 for owner');
        await activityLogRepo.save(activityLogRepo.create({
            id: (0, uuid_util_1.generateUuid)(),
            organizationId: orgId,
            userId: ownerId,
            entityType: 'project',
            entityId: projectId,
            action: 'create',
            metadata: { name: 'Seed Project' },
        }));
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
//# sourceMappingURL=run-seed.js.map