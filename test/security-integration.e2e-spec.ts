/**
 * Integration tests for security hardening: tenant isolation, notification IDOR, users endpoint.
 * Requires a running MySQL test database (same as dev or DB_DATABASE=mini_task_manager_test).
 * Run: npm run test:security
 *
 * These tests fail if tenant isolation or ownership checks are broken in future.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { DataSource, In } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';
import { generateUuid } from '../src/common/utils/uuid.util';
import { UserEntity } from '../src/modules/users/entities/user.entity';
import { OrganizationEntity } from '../src/modules/organizations/entities/organization.entity';
import { OrganizationMemberEntity } from '../src/modules/organizations/entities/organization-member.entity';
import { ProjectEntity } from '../src/modules/projects/entities/project.entity';
import { TaskEntity } from '../src/modules/tasks/entities/task.entity';
import { WorkflowEntity } from '../src/modules/workflows/entities/workflow.entity';
import { SprintEntity } from '../src/modules/sprints/entities/sprint.entity';
import { CustomFieldEntity } from '../src/modules/custom-fields/entities/custom-field.entity';
import { TaskCustomFieldValueEntity } from '../src/modules/custom-fields/entities/task-custom-field-value.entity';
import { NotificationEntity } from '../src/modules/notifications/entities/notification.entity';
import { TaskCommentEntity } from '../src/modules/tasks/entities/task-comment.entity';
import { TaskAttachmentEntity } from '../src/modules/tasks/entities/task-attachment.entity';
import { WorkflowStatusEntity } from '../src/modules/workflows/entities/workflow-status.entity';
import { ProjectMemberEntity } from '../src/modules/projects/entities/project-member.entity';
import { PaymentEntity } from '../src/modules/billing/entities/payment.entity';
import { InvoiceEntity } from '../src/modules/billing/entities/invoice.entity';
import { SubscriptionEntity } from '../src/modules/billing/entities/subscription.entity';
import { ActivityLogEntity } from '../src/modules/activity-logs/entities/activity-log.entity';

const API_PREFIX = 'api/v1';
const PASSWORD = 'Password123!';
const SEED_EMAIL_A = 'security-test-a@example.com';
const SEED_EMAIL_B = 'security-test-b@example.com';

/** Ensures UUID is in string form (id may come back as Buffer from DB). */
function toUuidString(id: string | Buffer): string {
  if (typeof id === 'string') return id;
  const hex = (id as Buffer).toString('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join('-');
}

/** Run DELETE with BINARY(16) IN list via query builder to avoid transformer receiving non-strings. */
async function deleteWhereIdIn<T>(
  em: DataSource['manager'],
  entity: new (...args: unknown[]) => T,
  column: string,
  uuidStrings: string[],
): Promise<void> {
  if (uuidStrings.length === 0) return;
  const hexList = uuidStrings.map((u) => u.replace(/-/g, ''));
  await em
    .createQueryBuilder()
    .delete()
    .from(entity)
    .where(`\`${column}\` IN (${hexList.map((_, i) => `UNHEX(:h${i})`).join(', ')})`, Object.fromEntries(hexList.map((h, i) => [`h${i}`, h])))
    .execute();
}

/**
 * Deletes existing seed data in reverse FK order so re-runs do not hit unique/FK errors.
 * Keeps FK checks enabled; only deletes rows identified by seed user emails.
 */
async function cleanupSeedData(dataSource: DataSource): Promise<void> {
  const em = dataSource.manager;
  const users = await em.find(UserEntity, {
    where: { email: In([SEED_EMAIL_A, SEED_EMAIL_B]) },
    select: ['id'],
  });
  if (users.length === 0) return;

  const userIds = users.map((u) => toUuidString(u.id));
  const orgs = await em.find(OrganizationEntity, {
    where: { ownerId: In(userIds) },
    select: ['id'],
  });
  const orgIds = orgs.map((o) => toUuidString(o.id));
  if (orgIds.length === 0) {
    await deleteWhereIdIn(em, UserEntity, 'id', userIds);
    return;
  }

  const projects = await em.find(ProjectEntity, {
    where: { organizationId: In(orgIds) },
    select: ['id'],
  });
  const projectIds = projects.map((p) => toUuidString(p.id));
  const taskIds =
    projectIds.length > 0
      ? (await em.find(TaskEntity, { where: { projectId: In(projectIds) }, select: ['id'] })).map((t) => toUuidString(t.id))
      : [];
  const workflowIds =
    projectIds.length > 0
      ? (await em.find(WorkflowEntity, { where: { projectId: In(projectIds) }, select: ['id'] })).map((w) => toUuidString(w.id))
      : [];

  if (taskIds.length > 0) await deleteWhereIdIn(em, TaskCustomFieldValueEntity, 'task_id', taskIds);
  if (taskIds.length > 0) await deleteWhereIdIn(em, TaskAttachmentEntity, 'task_id', taskIds);
  if (taskIds.length > 0) await deleteWhereIdIn(em, TaskCommentEntity, 'task_id', taskIds);
  if (taskIds.length > 0) await deleteWhereIdIn(em, TaskEntity, 'id', taskIds);
  if (projectIds.length > 0) await deleteWhereIdIn(em, CustomFieldEntity, 'project_id', projectIds);
  if (workflowIds.length > 0) await deleteWhereIdIn(em, WorkflowStatusEntity, 'workflow_id', workflowIds);
  if (projectIds.length > 0) await deleteWhereIdIn(em, WorkflowEntity, 'project_id', projectIds);
  if (projectIds.length > 0) await deleteWhereIdIn(em, SprintEntity, 'project_id', projectIds);
  if (projectIds.length > 0) await deleteWhereIdIn(em, ProjectMemberEntity, 'project_id', projectIds);
  if (projectIds.length > 0) await deleteWhereIdIn(em, ProjectEntity, 'id', projectIds);
  await deleteWhereIdIn(em, NotificationEntity, 'user_id', userIds);

  const subs = await em.find(SubscriptionEntity, { where: { organizationId: In(orgIds) }, select: ['id'] });
  const subIds = subs.map((s) => toUuidString(s.id));
  if (subIds.length > 0) {
    const invoices = await em.find(InvoiceEntity, { where: { subscriptionId: In(subIds) }, select: ['id'] });
    const invoiceIds = invoices.map((i) => toUuidString(i.id));
    if (invoiceIds.length > 0) await deleteWhereIdIn(em, PaymentEntity, 'invoice_id', invoiceIds);
    await deleteWhereIdIn(em, InvoiceEntity, 'subscription_id', subIds);
  }
  await deleteWhereIdIn(em, SubscriptionEntity, 'organization_id', orgIds);
  await deleteWhereIdIn(em, ActivityLogEntity, 'organization_id', orgIds);
  await deleteWhereIdIn(em, OrganizationMemberEntity, 'organization_id', orgIds);
  await deleteWhereIdIn(em, OrganizationEntity, 'id', orgIds);
  await deleteWhereIdIn(em, UserEntity, 'id', userIds);
}

interface SeedIds {
  userAId: string;
  userBId: string;
  orgAId: string;
  orgBId: string;
  projectAId: string;
  projectBId: string;
  taskAId: string;
  workflowAId: string;
  sprintAId: string;
  customFieldAId: string;
  notificationBId: string;
}

interface SeedData extends SeedIds {
  tokenA: string;
  tokenB: string;
}

describe('Security integration (tenant isolation, IDOR, users)', () => {
  let app: INestApplication;
  let seed: SeedData;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    const dataSource = app.get(getDataSourceToken()) as DataSource;
    const hash = await bcrypt.hash(PASSWORD, 10);

    // 1. Cleanup: remove any existing seed data in reverse FK order so re-runs don't hit unique/FK errors.
    await cleanupSeedData(dataSource);

    // 2. Seed inside a single transaction so all inserts see each other and FK constraints are satisfied.
    const seedResult = await dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(UserEntity);
      const orgRepo = manager.getRepository(OrganizationEntity);
      const orgMemberRepo = manager.getRepository(OrganizationMemberEntity);
      const projectRepo = manager.getRepository(ProjectEntity);
      const taskRepo = manager.getRepository(TaskEntity);
      const workflowRepo = manager.getRepository(WorkflowEntity);
      const sprintRepo = manager.getRepository(SprintEntity);
      const customFieldRepo = manager.getRepository(CustomFieldEntity);
      const notificationRepo = manager.getRepository(NotificationEntity);

      const userAId = generateUuid();
      const userBId = generateUuid();
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

      const orgAId = generateUuid();
      const orgBId = generateUuid();
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
        id: generateUuid(),
        organizationId: orgAId,
        userId: userAId,
        role: 'admin',
      });
      const memberB = orgMemberRepo.create({
        id: generateUuid(),
        organizationId: orgBId,
        userId: userBId,
        role: 'admin',
      });
      await orgMemberRepo.save(memberA);
      await orgMemberRepo.save(memberB);

      const projectAId = generateUuid();
      const projectBId = generateUuid();
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

      const taskAId = generateUuid();
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

      const workflowAId = generateUuid();
      const workflowA = workflowRepo.create({
        id: workflowAId,
        projectId: projectAId,
        name: 'Default',
        isDefault: true,
      });
      await workflowRepo.save(workflowA);

      const sprintAId = generateUuid();
      const sprintA = sprintRepo.create({
        id: sprintAId,
        projectId: projectAId,
        name: 'Sprint 1',
        status: 'PLANNED',
      });
      await sprintRepo.save(sprintA);

      const customFieldAId = generateUuid();
      const customFieldA = customFieldRepo.create({
        id: customFieldAId,
        projectId: projectAId,
        name: 'Field1',
        fieldType: 'TEXT',
        isRequired: false,
      });
      await customFieldRepo.save(customFieldA);

      const notificationBId = generateUuid();
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

    // 3. Login via HTTP (after transaction commit so users are visible).
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
      expect(res.body.data.some((t: { id: string }) => t.id === seed.taskAId)).toBe(true);
    });

    it('GET /custom-fields/project/:projectId – returns fields when project in same tenant', async () => {
      const res = await request(app.getHttpServer())
        .get(`/${API_PREFIX}/custom-fields/project/${seed.projectAId}`)
        .set('Authorization', `Bearer ${seed.tokenA}`)
        .set('X-Organization-Id', seed.orgAId);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body.some((f: { id: string }) => f.id === seed.customFieldAId)).toBe(true);
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
