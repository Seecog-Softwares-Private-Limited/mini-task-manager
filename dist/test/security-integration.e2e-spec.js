"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const request = require("supertest");
const bcrypt = require("bcrypt");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const app_module_1 = require("../src/app.module");
const http_exception_filter_1 = require("../src/common/filters/http-exception.filter");
const uuid_util_1 = require("../src/common/utils/uuid.util");
const user_entity_1 = require("../src/modules/users/entities/user.entity");
const organization_entity_1 = require("../src/modules/organizations/entities/organization.entity");
const organization_member_entity_1 = require("../src/modules/organizations/entities/organization-member.entity");
const project_entity_1 = require("../src/modules/projects/entities/project.entity");
const task_entity_1 = require("../src/modules/tasks/entities/task.entity");
const workflow_entity_1 = require("../src/modules/workflows/entities/workflow.entity");
const sprint_entity_1 = require("../src/modules/sprints/entities/sprint.entity");
const custom_field_entity_1 = require("../src/modules/custom-fields/entities/custom-field.entity");
const task_custom_field_value_entity_1 = require("../src/modules/custom-fields/entities/task-custom-field-value.entity");
const notification_entity_1 = require("../src/modules/notifications/entities/notification.entity");
const task_comment_entity_1 = require("../src/modules/tasks/entities/task-comment.entity");
const task_attachment_entity_1 = require("../src/modules/tasks/entities/task-attachment.entity");
const workflow_status_entity_1 = require("../src/modules/workflows/entities/workflow-status.entity");
const project_member_entity_1 = require("../src/modules/projects/entities/project-member.entity");
const payment_entity_1 = require("../src/modules/billing/entities/payment.entity");
const invoice_entity_1 = require("../src/modules/billing/entities/invoice.entity");
const subscription_entity_1 = require("../src/modules/billing/entities/subscription.entity");
const activity_log_entity_1 = require("../src/modules/activity-logs/entities/activity-log.entity");
const API_PREFIX = 'api/v1';
const PASSWORD = 'Password123!';
const SEED_EMAIL_A = 'security-test-a@example.com';
const SEED_EMAIL_B = 'security-test-b@example.com';
function toUuidString(id) {
    if (typeof id === 'string')
        return id;
    const hex = id.toString('hex');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join('-');
}
async function deleteWhereIdIn(em, entity, column, uuidStrings) {
    if (uuidStrings.length === 0)
        return;
    const hexList = uuidStrings.map((u) => u.replace(/-/g, ''));
    await em
        .createQueryBuilder()
        .delete()
        .from(entity)
        .where(`\`${column}\` IN (${hexList.map((_, i) => `UNHEX(:h${i})`).join(', ')})`, Object.fromEntries(hexList.map((h, i) => [`h${i}`, h])))
        .execute();
}
async function cleanupSeedData(dataSource) {
    const em = dataSource.manager;
    const users = await em.find(user_entity_1.UserEntity, {
        where: { email: (0, typeorm_1.In)([SEED_EMAIL_A, SEED_EMAIL_B]) },
        select: ['id'],
    });
    if (users.length === 0)
        return;
    const userIds = users.map((u) => toUuidString(u.id));
    const orgs = await em.find(organization_entity_1.OrganizationEntity, {
        where: { ownerId: (0, typeorm_1.In)(userIds) },
        select: ['id'],
    });
    const orgIds = orgs.map((o) => toUuidString(o.id));
    if (orgIds.length === 0) {
        await deleteWhereIdIn(em, user_entity_1.UserEntity, 'id', userIds);
        return;
    }
    const projects = await em.find(project_entity_1.ProjectEntity, {
        where: { organizationId: (0, typeorm_1.In)(orgIds) },
        select: ['id'],
    });
    const projectIds = projects.map((p) => toUuidString(p.id));
    const taskIds = projectIds.length > 0
        ? (await em.find(task_entity_1.TaskEntity, { where: { projectId: (0, typeorm_1.In)(projectIds) }, select: ['id'] })).map((t) => toUuidString(t.id))
        : [];
    const workflowIds = projectIds.length > 0
        ? (await em.find(workflow_entity_1.WorkflowEntity, { where: { projectId: (0, typeorm_1.In)(projectIds) }, select: ['id'] })).map((w) => toUuidString(w.id))
        : [];
    if (taskIds.length > 0)
        await deleteWhereIdIn(em, task_custom_field_value_entity_1.TaskCustomFieldValueEntity, 'task_id', taskIds);
    if (taskIds.length > 0)
        await deleteWhereIdIn(em, task_attachment_entity_1.TaskAttachmentEntity, 'task_id', taskIds);
    if (taskIds.length > 0)
        await deleteWhereIdIn(em, task_comment_entity_1.TaskCommentEntity, 'task_id', taskIds);
    if (taskIds.length > 0)
        await deleteWhereIdIn(em, task_entity_1.TaskEntity, 'id', taskIds);
    if (projectIds.length > 0)
        await deleteWhereIdIn(em, custom_field_entity_1.CustomFieldEntity, 'project_id', projectIds);
    if (workflowIds.length > 0)
        await deleteWhereIdIn(em, workflow_status_entity_1.WorkflowStatusEntity, 'workflow_id', workflowIds);
    if (projectIds.length > 0)
        await deleteWhereIdIn(em, workflow_entity_1.WorkflowEntity, 'project_id', projectIds);
    if (projectIds.length > 0)
        await deleteWhereIdIn(em, sprint_entity_1.SprintEntity, 'project_id', projectIds);
    if (projectIds.length > 0)
        await deleteWhereIdIn(em, project_member_entity_1.ProjectMemberEntity, 'project_id', projectIds);
    if (projectIds.length > 0)
        await deleteWhereIdIn(em, project_entity_1.ProjectEntity, 'id', projectIds);
    await deleteWhereIdIn(em, notification_entity_1.NotificationEntity, 'user_id', userIds);
    const subs = await em.find(subscription_entity_1.SubscriptionEntity, { where: { organizationId: (0, typeorm_1.In)(orgIds) }, select: ['id'] });
    const subIds = subs.map((s) => toUuidString(s.id));
    if (subIds.length > 0) {
        const invoices = await em.find(invoice_entity_1.InvoiceEntity, { where: { subscriptionId: (0, typeorm_1.In)(subIds) }, select: ['id'] });
        const invoiceIds = invoices.map((i) => toUuidString(i.id));
        if (invoiceIds.length > 0)
            await deleteWhereIdIn(em, payment_entity_1.PaymentEntity, 'invoice_id', invoiceIds);
        await deleteWhereIdIn(em, invoice_entity_1.InvoiceEntity, 'subscription_id', subIds);
    }
    await deleteWhereIdIn(em, subscription_entity_1.SubscriptionEntity, 'organization_id', orgIds);
    await deleteWhereIdIn(em, activity_log_entity_1.ActivityLogEntity, 'organization_id', orgIds);
    await deleteWhereIdIn(em, organization_member_entity_1.OrganizationMemberEntity, 'organization_id', orgIds);
    await deleteWhereIdIn(em, organization_entity_1.OrganizationEntity, 'id', orgIds);
    await deleteWhereIdIn(em, user_entity_1.UserEntity, 'id', userIds);
}
describe('Security integration (tenant isolation, IDOR, users)', () => {
    let app;
    let seed;
    beforeAll(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleRef.createNestApplication();
        app.setGlobalPrefix(API_PREFIX);
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }));
        app.useGlobalFilters(new http_exception_filter_1.GlobalExceptionFilter());
        await app.init();
        const dataSource = app.get((0, typeorm_2.getDataSourceToken)());
        const hash = await bcrypt.hash(PASSWORD, 10);
        await cleanupSeedData(dataSource);
        const seedResult = await dataSource.transaction(async (manager) => {
            const userRepo = manager.getRepository(user_entity_1.UserEntity);
            const orgRepo = manager.getRepository(organization_entity_1.OrganizationEntity);
            const orgMemberRepo = manager.getRepository(organization_member_entity_1.OrganizationMemberEntity);
            const projectRepo = manager.getRepository(project_entity_1.ProjectEntity);
            const taskRepo = manager.getRepository(task_entity_1.TaskEntity);
            const workflowRepo = manager.getRepository(workflow_entity_1.WorkflowEntity);
            const sprintRepo = manager.getRepository(sprint_entity_1.SprintEntity);
            const customFieldRepo = manager.getRepository(custom_field_entity_1.CustomFieldEntity);
            const notificationRepo = manager.getRepository(notification_entity_1.NotificationEntity);
            const userAId = (0, uuid_util_1.generateUuid)();
            const userBId = (0, uuid_util_1.generateUuid)();
            const userA = userRepo.create({
                id: userAId,
                email: SEED_EMAIL_A,
                fullName: 'User A',
                passwordHash: hash,
            });
            const userB = userRepo.create({
                id: userBId,
                email: SEED_EMAIL_B,
                fullName: 'User B',
                passwordHash: hash,
            });
            await userRepo.save(userA);
            await userRepo.save(userB);
            const orgAId = (0, uuid_util_1.generateUuid)();
            const orgBId = (0, uuid_util_1.generateUuid)();
            const orgA = orgRepo.create({
                id: orgAId,
                name: 'Org A',
                slug: 'org-a-security-' + Date.now(),
                ownerId: userAId,
            });
            const orgB = orgRepo.create({
                id: orgBId,
                name: 'Org B',
                slug: 'org-b-security-' + Date.now(),
                ownerId: userBId,
            });
            await orgRepo.save(orgA);
            await orgRepo.save(orgB);
            const memberA = orgMemberRepo.create({
                id: (0, uuid_util_1.generateUuid)(),
                organizationId: orgAId,
                userId: userAId,
                role: 'admin',
            });
            const memberB = orgMemberRepo.create({
                id: (0, uuid_util_1.generateUuid)(),
                organizationId: orgBId,
                userId: userBId,
                role: 'admin',
            });
            await orgMemberRepo.save(memberA);
            await orgMemberRepo.save(memberB);
            const projectAId = (0, uuid_util_1.generateUuid)();
            const projectBId = (0, uuid_util_1.generateUuid)();
            const projectA = projectRepo.create({
                id: projectAId,
                organizationId: orgAId,
                createdBy: userAId,
                name: 'Project A',
                description: null,
                visibility: 'PRIVATE',
            });
            const projectB = projectRepo.create({
                id: projectBId,
                organizationId: orgBId,
                createdBy: userBId,
                name: 'Project B',
                description: null,
                visibility: 'PRIVATE',
            });
            await projectRepo.save(projectA);
            await projectRepo.save(projectB);
            const taskAId = (0, uuid_util_1.generateUuid)();
            const taskA = taskRepo.create({
                id: taskAId,
                projectId: projectAId,
                organizationId: orgAId,
                reporterId: userAId,
                title: 'Task A',
                description: null,
                priority: 'MEDIUM',
            });
            await taskRepo.save(taskA);
            const workflowAId = (0, uuid_util_1.generateUuid)();
            const workflowA = workflowRepo.create({
                id: workflowAId,
                projectId: projectAId,
                name: 'Default',
                isDefault: true,
            });
            await workflowRepo.save(workflowA);
            const sprintAId = (0, uuid_util_1.generateUuid)();
            const sprintA = sprintRepo.create({
                id: sprintAId,
                projectId: projectAId,
                name: 'Sprint 1',
                status: 'PLANNED',
            });
            await sprintRepo.save(sprintA);
            const customFieldAId = (0, uuid_util_1.generateUuid)();
            const customFieldA = customFieldRepo.create({
                id: customFieldAId,
                projectId: projectAId,
                name: 'Field1',
                fieldType: 'TEXT',
                isRequired: false,
            });
            await customFieldRepo.save(customFieldA);
            const notificationBId = (0, uuid_util_1.generateUuid)();
            const notificationB = notificationRepo.create({
                id: notificationBId,
                userId: userBId,
                title: 'For User B',
                message: null,
            });
            await notificationRepo.save(notificationB);
            return {
                userAId,
                userBId,
                orgAId,
                orgBId,
                projectAId,
                projectBId,
                taskAId,
                workflowAId,
                sprintAId,
                customFieldAId,
                notificationBId,
            };
        });
        const loginA = await request(app.getHttpServer())
            .post(`/${API_PREFIX}/auth/login`)
            .send({ email: SEED_EMAIL_A, password: PASSWORD });
        const loginB = await request(app.getHttpServer())
            .post(`/${API_PREFIX}/auth/login`)
            .send({ email: SEED_EMAIL_B, password: PASSWORD });
        if (loginA.status !== 201 || !loginA.body?.accessToken) {
            throw new Error('Seed login A failed: ' + JSON.stringify(loginA.body));
        }
        if (loginB.status !== 201 || !loginB.body?.accessToken) {
            throw new Error('Seed login B failed: ' + JSON.stringify(loginB.body));
        }
        seed = {
            ...seedResult,
            tokenA: loginA.body.accessToken,
            tokenB: loginB.body.accessToken,
        };
    }, 30000);
    afterAll(async () => {
        await app?.close();
    });
    describe('1. Tenant isolation – User from Tenant A cannot access Tenant B resources', () => {
        it('GET /projects/:id – returns 200 with null when project belongs to another tenant', async () => {
            const res = await request(app.getHttpServer())
                .get(`/${API_PREFIX}/projects/${seed.projectBId}`)
                .set('Authorization', `Bearer ${seed.tokenA}`)
                .set('X-Organization-Id', seed.orgAId);
            expect(res.status).toBe(200);
            expect(res.body == null || (typeof res.body === 'object' && Object.keys(res.body).length === 0)).toBe(true);
        });
        it('GET /tasks/:id – returns 200 with null when task belongs to another tenant', async () => {
            const res = await request(app.getHttpServer())
                .get(`/${API_PREFIX}/tasks/${seed.taskAId}`)
                .set('Authorization', `Bearer ${seed.tokenB}`)
                .set('X-Organization-Id', seed.orgBId);
            expect(res.status).toBe(200);
            expect(res.body == null || (typeof res.body === 'object' && Object.keys(res.body).length === 0)).toBe(true);
        });
        it('GET /workflows/:id – returns 200 with null when workflow belongs to another tenant', async () => {
            const res = await request(app.getHttpServer())
                .get(`/${API_PREFIX}/workflows/${seed.workflowAId}`)
                .set('Authorization', `Bearer ${seed.tokenB}`)
                .set('X-Organization-Id', seed.orgBId);
            expect(res.status).toBe(200);
            expect(res.body == null || (typeof res.body === 'object' && Object.keys(res.body).length === 0)).toBe(true);
        });
        it('GET /sprints/:id – returns 200 with null when sprint belongs to another tenant', async () => {
            const res = await request(app.getHttpServer())
                .get(`/${API_PREFIX}/sprints/${seed.sprintAId}`)
                .set('Authorization', `Bearer ${seed.tokenB}`)
                .set('X-Organization-Id', seed.orgBId);
            expect(res.status).toBe(200);
            expect(res.body == null || (typeof res.body === 'object' && Object.keys(res.body).length === 0)).toBe(true);
        });
        it('GET /tasks/project/:projectId – returns empty data when project belongs to another tenant', async () => {
            const res = await request(app.getHttpServer())
                .get(`/${API_PREFIX}/tasks/project/${seed.projectAId}`)
                .query({ page: 1, limit: 20 })
                .set('Authorization', `Bearer ${seed.tokenB}`)
                .set('X-Organization-Id', seed.orgBId);
            expect(res.status).toBe(200);
            expect(res.body?.data).toEqual([]);
            expect(res.body?.meta?.total).toBe(0);
        });
        it('GET /workflows/project/:projectId – returns empty array when project belongs to another tenant', async () => {
            const res = await request(app.getHttpServer())
                .get(`/${API_PREFIX}/workflows/project/${seed.projectAId}`)
                .set('Authorization', `Bearer ${seed.tokenB}`)
                .set('X-Organization-Id', seed.orgBId);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body).toHaveLength(0);
        });
        it('GET /sprints/project/:projectId – returns empty array when project belongs to another tenant', async () => {
            const res = await request(app.getHttpServer())
                .get(`/${API_PREFIX}/sprints/project/${seed.projectAId}`)
                .set('Authorization', `Bearer ${seed.tokenB}`)
                .set('X-Organization-Id', seed.orgBId);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body).toHaveLength(0);
        });
        it('GET /custom-fields/project/:projectId – returns empty array when project belongs to another tenant', async () => {
            const res = await request(app.getHttpServer())
                .get(`/${API_PREFIX}/custom-fields/project/${seed.projectAId}`)
                .set('Authorization', `Bearer ${seed.tokenB}`)
                .set('X-Organization-Id', seed.orgBId);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body).toHaveLength(0);
        });
    });
    describe('2. Notification IDOR – User A cannot mark User B’s notification as read', () => {
        it('PATCH /notifications/:id/read – returns 404 when notification belongs to another user', async () => {
            const res = await request(app.getHttpServer())
                .patch(`/${API_PREFIX}/notifications/${seed.notificationBId}/read`)
                .set('Authorization', `Bearer ${seed.tokenA}`);
            expect(res.status).toBe(404);
        });
    });
    describe('3. Users endpoint – User cannot access another user’s profile', () => {
        it('GET /users/:id – returns 403 when requesting another user’s profile', async () => {
            const res = await request(app.getHttpServer())
                .get(`/${API_PREFIX}/users/${seed.userBId}`)
                .set('Authorization', `Bearer ${seed.tokenA}`);
            expect(res.status).toBe(403);
        });
    });
    describe('4. Positive control – Same-tenant access works', () => {
        it('GET /projects/:id – returns project when same tenant', async () => {
            const res = await request(app.getHttpServer())
                .get(`/${API_PREFIX}/projects/${seed.projectAId}`)
                .set('Authorization', `Bearer ${seed.tokenA}`)
                .set('X-Organization-Id', seed.orgAId);
            expect(res.status).toBe(200);
            expect(res.body).not.toBeNull();
            expect(res.body.id).toBe(seed.projectAId);
            expect(res.body.organizationId).toBe(seed.orgAId);
        });
        it('GET /tasks/:id – returns task when same tenant', async () => {
            const res = await request(app.getHttpServer())
                .get(`/${API_PREFIX}/tasks/${seed.taskAId}`)
                .set('Authorization', `Bearer ${seed.tokenA}`)
                .set('X-Organization-Id', seed.orgAId);
            expect(res.status).toBe(200);
            expect(res.body).not.toBeNull();
            expect(res.body.id).toBe(seed.taskAId);
            expect(res.body.organizationId).toBe(seed.orgAId);
        });
        it('GET /workflows/:id – returns workflow when same tenant', async () => {
            const res = await request(app.getHttpServer())
                .get(`/${API_PREFIX}/workflows/${seed.workflowAId}`)
                .set('Authorization', `Bearer ${seed.tokenA}`)
                .set('X-Organization-Id', seed.orgAId);
            expect(res.status).toBe(200);
            expect(res.body).not.toBeNull();
            expect(res.body.id).toBe(seed.workflowAId);
        });
        it('GET /sprints/:id – returns sprint when same tenant', async () => {
            const res = await request(app.getHttpServer())
                .get(`/${API_PREFIX}/sprints/${seed.sprintAId}`)
                .set('Authorization', `Bearer ${seed.tokenA}`)
                .set('X-Organization-Id', seed.orgAId);
            expect(res.status).toBe(200);
            expect(res.body).not.toBeNull();
            expect(res.body.id).toBe(seed.sprintAId);
        });
        it('GET /tasks/project/:projectId – returns tasks when project in same tenant', async () => {
            const res = await request(app.getHttpServer())
                .get(`/${API_PREFIX}/tasks/project/${seed.projectAId}`)
                .query({ page: 1, limit: 20 })
                .set('Authorization', `Bearer ${seed.tokenA}`)
                .set('X-Organization-Id', seed.orgAId);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body?.data)).toBe(true);
            expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
            expect(res.body.data.some((t) => t.id === seed.taskAId)).toBe(true);
        });
        it('GET /custom-fields/project/:projectId – returns fields when project in same tenant', async () => {
            const res = await request(app.getHttpServer())
                .get(`/${API_PREFIX}/custom-fields/project/${seed.projectAId}`)
                .set('Authorization', `Bearer ${seed.tokenA}`)
                .set('X-Organization-Id', seed.orgAId);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
            expect(res.body.some((f) => f.id === seed.customFieldAId)).toBe(true);
        });
        it('GET /users/:id – returns own profile when id is current user', async () => {
            const res = await request(app.getHttpServer())
                .get(`/${API_PREFIX}/users/${seed.userAId}`)
                .set('Authorization', `Bearer ${seed.tokenA}`);
            expect(res.status).toBe(200);
            expect(res.body).not.toBeNull();
            expect(res.body.id).toBe(seed.userAId);
            expect(res.body.email).toBe('security-test-a@example.com');
            expect(res.body).not.toHaveProperty('passwordHash');
        });
        it('PATCH /notifications/:id/read – returns 200 when notification belongs to current user', async () => {
            const res = await request(app.getHttpServer())
                .patch(`/${API_PREFIX}/notifications/${seed.notificationBId}/read`)
                .set('Authorization', `Bearer ${seed.tokenB}`);
            expect(res.status).toBe(200);
            expect(res.body?.message).toBe('OK');
        });
    });
});
//# sourceMappingURL=security-integration.e2e-spec.js.map