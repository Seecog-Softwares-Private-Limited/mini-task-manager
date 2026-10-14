/**
 * Upserts App Store review demo account with sample workspace data so Review
 * can explore Projects, Board, Planner, Tasks, and Alerts without upgrading.
 *
 * Run: npm run seed:app-review
 *
 * Login: test@test.com / Test123$
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { DataSource } from 'typeorm';
import { configuration } from '../../../config/configuration';
import { generateUuid } from '../../../common/utils/uuid.util';
import { hashPassword } from '../../../modules/users/password-storage.util';
import { UserEntity } from '../../../modules/users/entities/user.entity';
import { OrganizationEntity } from '../../../modules/organizations/entities/organization.entity';
import { OrganizationMemberEntity } from '../../../modules/organizations/entities/organization-member.entity';
import { ProjectEntity } from '../../../modules/projects/entities/project.entity';
import { ProjectMemberEntity } from '../../../modules/projects/entities/project-member.entity';
import { WorkflowEntity } from '../../../modules/workflows/entities/workflow.entity';
import { WorkflowStatusEntity } from '../../../modules/workflows/entities/workflow-status.entity';
import { TaskEntity } from '../../../modules/tasks/entities/task.entity';
import { RecurringTaskTemplateEntity } from '../../../modules/tasks/entities/recurring-task-template.entity';
import { SprintEntity } from '../../../modules/sprints/entities/sprint.entity';
import { NotificationEntity } from '../../../modules/notifications/entities/notification.entity';

const EMAIL = 'test@test.com';
const PASSWORD = 'Test123$';
const FULL_NAME = 'App Review Tester';
const WORKSPACE_NAME = 'App Review Workspace';
const PROJECT_NAME = 'App Review Project';
const PLANNER_TITLE = 'Daily standup checklist';

function ymd(offsetDays: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function seedAppReviewUser() {
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
      ProjectEntity,
      ProjectMemberEntity,
      WorkflowEntity,
      WorkflowStatusEntity,
      TaskEntity,
      RecurringTaskTemplateEntity,
      SprintEntity,
      NotificationEntity,
    ],
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  console.log(`Connected to ${dbConfig.host}/${dbConfig.database}`);

  const userRepo = dataSource.getRepository(UserEntity);
  const orgRepo = dataSource.getRepository(OrganizationEntity);
  const orgMemberRepo = dataSource.getRepository(OrganizationMemberEntity);
  const projectRepo = dataSource.getRepository(ProjectEntity);
  const projectMemberRepo = dataSource.getRepository(ProjectMemberEntity);
  const workflowRepo = dataSource.getRepository(WorkflowEntity);
  const statusRepo = dataSource.getRepository(WorkflowStatusEntity);
  const taskRepo = dataSource.getRepository(TaskEntity);
  const templateRepo = dataSource.getRepository(RecurringTaskTemplateEntity);
  const notificationRepo = dataSource.getRepository(NotificationEntity);

  const passwordHash = await hashPassword(PASSWORD);
  const email = EMAIL.toLowerCase();

  let user = await userRepo.findOne({ where: { email } });
  if (!user) {
    user = await userRepo.save(
      userRepo.create({
        id: generateUuid(),
        email,
        fullName: FULL_NAME,
        passwordHash,
        isEmailVerified: true,
        isActive: true,
        currentPlan: 'free',
        onboardingCompletedAt: new Date(),
      }),
    );
    console.log(`Created user ${email}`);
  } else {
    await userRepo.update(user.id, {
      fullName: FULL_NAME,
      passwordHash,
      isEmailVerified: true,
      isActive: true,
      currentPlan: 'free',
      onboardingCompletedAt: user.onboardingCompletedAt ?? new Date(),
    });
    user = (await userRepo.findOne({ where: { id: user.id } }))!;
    console.log(`Updated user ${email} (plan=free)`);
  }

  const memberships = await orgMemberRepo.find({
    where: { userId: user.id, status: 'ACTIVE' },
  });

  let organizationId: string;
  if (memberships.length === 0) {
    organizationId = generateUuid();
    const slug = `app-review-${user.id.replace(/-/g, '').slice(0, 10)}`;
    await orgRepo.save(
      orgRepo.create({
        id: organizationId,
        name: WORKSPACE_NAME,
        slug,
        ownerId: user.id,
      }),
    );
    await orgMemberRepo.save(
      orgMemberRepo.create({
        id: generateUuid(),
        organizationId,
        userId: user.id,
        role: 'owner',
        status: 'ACTIVE',
      }),
    );
    console.log(`Created ${WORKSPACE_NAME} (owner)`);
  } else {
    const ownerMembership =
      memberships.find((m) => (m.role || '').toLowerCase() === 'owner') ??
      memberships[0];
    organizationId = ownerMembership.organizationId;
    if ((ownerMembership.role || '').toLowerCase() !== 'owner') {
      await orgMemberRepo.update(ownerMembership.id, { role: 'owner' });
      console.log(`Promoted membership to owner in org ${organizationId}`);
    } else {
      console.log(`Using existing workspace ${organizationId} (owner)`);
    }
  }

  const existingProjects = await projectRepo.find({
    where: { organizationId, isArchived: false },
  });

  let projectId: string;
  if (existingProjects.length === 0) {
    projectId = generateUuid();
    await projectRepo.save(
      projectRepo.create({
        id: projectId,
        organizationId,
        createdBy: user.id,
        name: PROJECT_NAME,
        description: 'Demo project for App Review — board, tasks, and planner',
        visibility: 'PRIVATE',
        isArchived: false,
      }),
    );
    console.log(`Created project: ${PROJECT_NAME}`);
  } else {
    projectId = existingProjects[0].id;
    console.log(`Using existing project: ${existingProjects[0].name}`);
  }

  const projectMembership = await projectMemberRepo.findOne({
    where: { projectId, userId: user.id },
  });
  if (!projectMembership) {
    await projectMemberRepo.save(
      projectMemberRepo.create({
        id: generateUuid(),
        projectId,
        userId: user.id,
        role: 'ADMIN',
      }),
    );
    console.log('Added user as project ADMIN');
  } else if ((projectMembership.role || '').toUpperCase() !== 'ADMIN') {
    await projectMemberRepo.update(projectMembership.id, { role: 'ADMIN' });
    console.log('Updated project membership to ADMIN');
  }

  // Workflow + statuses (required for Kanban columns)
  let workflow = await workflowRepo.findOne({
    where: { projectId, isDefault: true },
  });
  if (!workflow) {
    workflow = await workflowRepo.findOne({ where: { projectId } });
  }
  let statusTodoId: string;
  let statusProgressId: string;
  let statusDoneId: string;

  if (!workflow) {
    const workflowId = generateUuid();
    await workflowRepo.save(
      workflowRepo.create({
        id: workflowId,
        projectId,
        name: 'Default',
        isDefault: true,
      }),
    );
    statusTodoId = generateUuid();
    statusProgressId = generateUuid();
    statusDoneId = generateUuid();
    await statusRepo.save([
      statusRepo.create({
        id: statusTodoId,
        workflowId,
        name: 'To Do',
        position: 0,
        type: 'TODO',
        color: '#64748B',
      }),
      statusRepo.create({
        id: statusProgressId,
        workflowId,
        name: 'In Progress',
        position: 1,
        type: 'IN_PROGRESS',
        color: '#0284C7',
      }),
      statusRepo.create({
        id: statusDoneId,
        workflowId,
        name: 'Done',
        position: 2,
        type: 'DONE',
        color: '#059669',
      }),
    ]);
    console.log('Created workflow: To Do / In Progress / Done');
  } else {
    const statuses = await statusRepo.find({
      where: { workflowId: workflow.id },
      order: { position: 'ASC' },
    });
    const byType = (type: string) =>
      statuses.find((s) => (s.type || '').toUpperCase() === type)?.id;
    statusTodoId = byType('TODO') ?? statuses[0]?.id ?? generateUuid();
    statusProgressId =
      byType('IN_PROGRESS') ?? statuses[1]?.id ?? statusTodoId;
    statusDoneId = byType('DONE') ?? statuses[statuses.length - 1]?.id ?? statusTodoId;
    if (statuses.length === 0) {
      statusTodoId = generateUuid();
      statusProgressId = generateUuid();
      statusDoneId = generateUuid();
      await statusRepo.save([
        statusRepo.create({
          id: statusTodoId,
          workflowId: workflow.id,
          name: 'To Do',
          position: 0,
          type: 'TODO',
          color: '#64748B',
        }),
        statusRepo.create({
          id: statusProgressId,
          workflowId: workflow.id,
          name: 'In Progress',
          position: 1,
          type: 'IN_PROGRESS',
          color: '#0284C7',
        }),
        statusRepo.create({
          id: statusDoneId,
          workflowId: workflow.id,
          name: 'Done',
          position: 2,
          type: 'DONE',
          color: '#059669',
        }),
      ]);
      console.log('Created missing workflow statuses');
    } else {
      console.log(`Using existing workflow (${statuses.length} statuses)`);
    }
  }

  // Board tasks — seed only if this project has no non-recurring demo tasks yet
  const boardTaskCount = await taskRepo
    .createQueryBuilder('t')
    .where('t.project_id = :projectId', { projectId })
    .andWhere('t.organization_id = :organizationId', { organizationId })
    .andWhere('t.recurring_template_id IS NULL')
    .getCount();

  if (boardTaskCount === 0) {
    const today = ymd(0);
    const tomorrow = ymd(1);
    const inThreeDays = ymd(3);

    await taskRepo.save([
      taskRepo.create({
        id: generateUuid(),
        projectId,
        organizationId,
        reporterId: user.id,
        assigneeId: user.id,
        assigneeIds: [user.id],
        title: 'Review App Store submission checklist',
        description:
          'Confirm Support URL, Privacy Policy, EULA link, and IAP products are attached to this version.',
        statusId: statusTodoId,
        priority: 'HIGH',
        dueDate: tomorrow as unknown as Date,
        dueTime: '10:00',
        tags: [{ name: 'App Review', color: '#6467F2' }],
        subtasks: [
          {
            id: generateUuid(),
            title: 'Verify Privacy Policy opens',
            completed: true,
            status: 'DONE',
            priority: 'MEDIUM',
            assigneeId: user.id,
          },
          {
            id: generateUuid(),
            title: 'Confirm EULA link in Plans screen',
            completed: false,
            status: 'TODO',
            priority: 'HIGH',
            assigneeId: user.id,
            dueDate: tomorrow,
          },
          {
            id: generateUuid(),
            title: 'Attach Silver and Gold IAP screenshots',
            completed: false,
            status: 'TODO',
            priority: 'HIGH',
            assigneeId: user.id,
            dueDate: tomorrow,
          },
        ],
      }),
      taskRepo.create({
        id: generateUuid(),
        projectId,
        organizationId,
        reporterId: user.id,
        assigneeId: user.id,
        assigneeIds: [user.id],
        title: 'Walk through Planner and create a series',
        description:
          'Open Planner → Add planner → save a daily series with a short checklist.',
        statusId: statusProgressId,
        priority: 'MEDIUM',
        dueDate: today as unknown as Date,
        dueTime: '15:00',
        tags: [{ name: 'Demo', color: '#0284C7' }],
        subtasks: [
          {
            id: generateUuid(),
            title: 'Open Planner tab',
            completed: true,
            status: 'DONE',
            priority: 'LOW',
            assigneeId: user.id,
          },
          {
            id: generateUuid(),
            title: 'Tap Add planner and save',
            completed: false,
            status: 'IN_PROGRESS',
            priority: 'MEDIUM',
            assigneeId: user.id,
            dueDate: today,
          },
        ],
      }),
      taskRepo.create({
        id: generateUuid(),
        projectId,
        organizationId,
        reporterId: user.id,
        assigneeId: user.id,
        assigneeIds: [user.id],
        title: 'Invite a teammate (optional)',
        description: 'Workspace Settings → Invite member with a test email.',
        statusId: statusTodoId,
        priority: 'LOW',
        dueDate: inThreeDays as unknown as Date,
        subtasks: [
          {
            id: generateUuid(),
            title: 'Open workspace settings',
            completed: false,
            status: 'TODO',
            priority: 'LOW',
            assigneeId: user.id,
          },
        ],
      }),
      taskRepo.create({
        id: generateUuid(),
        projectId,
        organizationId,
        reporterId: user.id,
        assigneeId: user.id,
        assigneeIds: [user.id],
        title: 'Welcome to OpsPick',
        description:
          'Sample completed task so the Done column is not empty during review.',
        statusId: statusDoneId,
        priority: 'MEDIUM',
        completedAt: new Date(),
        dueDate: ymd(-1) as unknown as Date,
        subtasks: [
          {
            id: generateUuid(),
            title: 'Sign in with demo account',
            completed: true,
            status: 'DONE',
            priority: 'MEDIUM',
            assigneeId: user.id,
          },
        ],
      }),
    ]);
    console.log('Created 4 board tasks (To Do / In Progress / Done)');
  } else {
    console.log(`Board already has ${boardTaskCount} task(s); skipped task seed`);
  }

  // Planner series — one daily checklist the reviewer can open immediately
  const existingPlanner = await templateRepo.findOne({
    where: { organizationId, projectId, title: PLANNER_TITLE },
  });
  if (!existingPlanner) {
    const start = ymd(0);
    const next = ymd(1);
    await templateRepo.save(
      templateRepo.create({
        id: generateUuid(),
        organizationId,
        projectId,
        createdBy: user.id,
        title: PLANNER_TITLE,
        description:
          'Sample daily planner for App Review. Open Series → tap Add planner to create another.',
        statusId: statusTodoId,
        priority: 'MEDIUM',
        assigneeId: user.id,
        assigneeIds: [user.id],
        templateSubtasks: [
          {
            id: generateUuid(),
            title: 'Check overnight alerts',
            completed: false,
            status: 'TODO',
            priority: 'MEDIUM',
            assigneeId: user.id,
            dueOffsetDays: 0,
            dueTime: '09:00',
          },
          {
            id: generateUuid(),
            title: 'Update board priorities',
            completed: false,
            status: 'TODO',
            priority: 'MEDIUM',
            assigneeId: user.id,
            dueOffsetDays: 0,
            dueTime: '09:15',
          },
          {
            id: generateUuid(),
            title: "Confirm tomorrow's due items",
            completed: false,
            status: 'TODO',
            priority: 'LOW',
            assigneeId: user.id,
            dueOffsetDays: 0,
            dueTime: '09:30',
          },
        ],
        tags: [{ name: 'Ritual', color: '#B150E2' }],
        repeatType: 'DAILY',
        ruleConfig: {
          repeat: 'DAILY',
          interval: 1,
          dueTime: '09:00',
          notifyMinutesBefore: 15,
        },
        createDaysBeforeDue: 0,
        startDueDate: start as unknown as Date,
        nextDueDate: next as unknown as Date,
        lastGeneratedDueDate: null,
        lastSequence: 0,
        generatedCount: 0,
        endType: 'NEVER',
        endDate: null,
        endAfterOccurrences: null,
        isPaused: false,
        stoppedAt: null,
      }),
    );
    console.log(`Created planner series: ${PLANNER_TITLE}`);
  } else {
    console.log(`Planner series already exists: ${PLANNER_TITLE}`);
  }

  // Alerts inbox sample
  const unreadCount = await notificationRepo.count({
    where: { userId: user.id, isRead: false },
  });
  if (unreadCount === 0) {
    await notificationRepo.save([
      notificationRepo.create({
        id: generateUuid(),
        userId: user.id,
        title: 'Welcome to OpsPick',
        message:
          'Demo account is ready. Open Projects → board, then Planner → Add planner.',
        data: { type: 'system', projectId },
        isRead: false,
      }),
      notificationRepo.create({
        id: generateUuid(),
        userId: user.id,
        title: 'Task assigned to you',
        message: 'Review App Store submission checklist is due tomorrow.',
        data: { type: 'task_assigned', projectId },
        isRead: false,
      }),
    ]);
    console.log('Created 2 unread notifications');
  } else {
    console.log(`User already has ${unreadCount} unread notification(s)`);
  }

  await dataSource.destroy();
  console.log('\nApp Review credentials ready:');
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`  Plan:     free`);
  console.log('  Sample data:');
  console.log('    • Project with Kanban columns');
  console.log('    • Board tasks (To Do / In Progress / Done)');
  console.log(`    • Planner series: "${PLANNER_TITLE}"`);
  console.log('    • Notifications in Alerts');
  console.log('  Try:');
  console.log('    Sign in → Projects → open board');
  console.log('    Sign in → Planner → open series / Add planner');
  console.log('    Sign in → Tasks / Alerts');
}

seedAppReviewUser().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
