import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { generateUuid } from '../../common/utils/uuid.util';
import { UserEntity } from '../users/entities/user.entity';
import { OrganizationEntity } from '../organizations/entities/organization.entity';
import { OrganizationMemberEntity } from '../organizations/entities/organization-member.entity';
import { ProjectEntity } from '../projects/entities/project.entity';
import { TaskEntity } from '../tasks/entities/task.entity';
import { PlanEntity } from '../billing/entities/plan.entity';
import { SubscriptionEntity } from '../billing/entities/subscription.entity';
import { InvoiceEntity } from '../billing/entities/invoice.entity';
import { BillingService } from '../billing/billing.service';
import { AdminService } from './admin.service';
import { PlatformSettingEntity } from './entities/platform-setting.entity';
import { NotificationLogEntity } from './entities/notification-log.entity';
import { ImpersonationLogEntity } from './entities/impersonation-log.entity';
import { GlobalAuditLogEntity } from './entities/global-audit-log.entity';
import { PlanConfigurationsService } from '../../plans/plan-configurations.service';
import { AuthService } from '../auth/auth.service';
import type {
  SuperAdminImpersonateDto,
  SuperAdminPlanUpsertDto,
  SuperAdminSendNotificationDto,
  SuperAdminSettingsUpdateDto,
  SuperAdminSubscriptionActionDto,
  SuperAdminTenantQueryDto,
  SuperAdminUserQueryDto,
} from './dto/super-admin.dto';

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly adminService: AdminService,
    private readonly billingService: BillingService,
    private readonly planConfigurationsService: PlanConfigurationsService,
    private readonly authService: AuthService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly orgRepo: Repository<OrganizationEntity>,
    @InjectRepository(OrganizationMemberEntity)
    private readonly orgMemberRepo: Repository<OrganizationMemberEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepo: Repository<ProjectEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepo: Repository<TaskEntity>,
    @InjectRepository(PlanEntity)
    private readonly planRepo: Repository<PlanEntity>,
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionRepo: Repository<SubscriptionEntity>,
    @InjectRepository(InvoiceEntity)
    private readonly invoiceRepo: Repository<InvoiceEntity>,
    @InjectRepository(PlatformSettingEntity)
    private readonly settingRepo: Repository<PlatformSettingEntity>,
    @InjectRepository(NotificationLogEntity)
    private readonly notificationRepo: Repository<NotificationLogEntity>,
    @InjectRepository(ImpersonationLogEntity)
    private readonly impersonationRepo: Repository<ImpersonationLogEntity>,
    @InjectRepository(GlobalAuditLogEntity)
    private readonly globalAuditRepo: Repository<GlobalAuditLogEntity>,
  ) {}

  async dashboard() {
    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalUsers,
      totalWorkspaces,
      totalProjects,
      totalTasks,
      activeSubscriptions,
      expiredSubscriptions,
      planUsers,
      revenueRows,
      registrationRows,
      storageRows,
      workspaceRows,
    ] = await Promise.all([
      this.orgRepo.count({ where: { status: 'ACTIVE' as const } }).then((active) =>
        this.orgRepo.count({ where: [{ status: 'ACTIVE' }, { status: 'SUSPENDED' }] }).then((all) => ({
          all,
          active,
        })),
      ),
      this.orgRepo.count({ where: { status: 'ACTIVE' } }),
      this.orgRepo.count({ where: { status: 'SUSPENDED' } }),
      this.userRepo.count(),
      this.orgRepo.count({ where: [{ status: 'ACTIVE' }, { status: 'SUSPENDED' }] }),
      this.projectRepo.count(),
      this.taskRepo.count(),
      this.subscriptionRepo.count({ where: { status: 'ACTIVE' } }),
      this.subscriptionRepo.count({ where: { status: 'EXPIRED' } }),
      this.userRepo
        .createQueryBuilder('u')
        .select('u.current_plan', 'plan')
        .addSelect('COUNT(*)', 'count')
        .groupBy('u.current_plan')
        .getRawMany<{ plan: string; count: string }>(),
      this.invoiceRepo
        .createQueryBuilder('i')
        .select("DATE_FORMAT(i.issued_at, '%Y-%m')", 'month')
        .addSelect('COALESCE(SUM(i.amount), 0)', 'amount')
        .groupBy("DATE_FORMAT(i.issued_at, '%Y-%m')")
        .orderBy('month', 'ASC')
        .getRawMany<{ month: string; amount: string }>(),
      this.userRepo
        .createQueryBuilder('u')
        .select("DATE_FORMAT(u.created_at, '%Y-%m')", 'month')
        .addSelect('COUNT(*)', 'count')
        .groupBy("DATE_FORMAT(u.created_at, '%Y-%m')")
        .orderBy('month', 'ASC')
        .getRawMany<{ month: string; count: string }>(),
      this.userRepo
        .createQueryBuilder('u')
        .select("DATE_FORMAT(u.created_at, '%Y-%m')", 'month')
        .addSelect('COALESCE(SUM(CAST(u.storage_used AS UNSIGNED)), 0)', 'storageUsed')
        .groupBy("DATE_FORMAT(u.created_at, '%Y-%m')")
        .orderBy('month', 'ASC')
        .getRawMany<{ month: string; storageUsed: string }>(),
      this.orgRepo
        .createQueryBuilder('o')
        .select("DATE_FORMAT(o.created_at, '%Y-%m')", 'month')
        .addSelect('COUNT(*)', 'count')
        .groupBy("DATE_FORMAT(o.created_at, '%Y-%m')")
        .orderBy('month', 'ASC')
        .getRawMany<{ month: string; count: string }>(),
    ]);

    const freeUsers = Number(planUsers.find((r) => r.plan === 'free')?.count ?? 0);
    const silverUsers = Number(planUsers.find((r) => r.plan === 'silver')?.count ?? 0);
    const goldUsers = Number(planUsers.find((r) => r.plan === 'gold')?.count ?? 0);
    const totalRevenue = revenueRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

    return {
      totalTenants: totalTenants.all,
      activeTenants,
      suspendedTenants,
      totalUsers,
      totalWorkspaces,
      totalProjects,
      totalTasks,
      totalRevenue,
      activeSubscriptions,
      expiredSubscriptions,
      freePlanUsers: freeUsers,
      silverPlanUsers: silverUsers,
      goldPlanUsers: goldUsers,
      charts: {
        revenueGrowth: revenueRows.map((r) => ({ month: r.month, value: Number(r.amount) })),
        monthlyRegistrations: registrationRows.map((r) => ({ month: r.month, value: Number(r.count) })),
        subscriptionAnalytics: {
          active: activeSubscriptions,
          expired: expiredSubscriptions,
        },
        storageUsageAnalytics: storageRows.map((r) => ({ month: r.month, value: Number(r.storageUsed) })),
        workspaceCreationAnalytics: workspaceRows.map((r) => ({ month: r.month, value: Number(r.count) })),
      },
    };
  }

  async tenants(query: SuperAdminTenantQueryDto) {
    const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10) || 20));
    const base = await this.adminService.listOrganizations({
      page,
      limit,
      search: query.search,
      status: query.status ?? 'ALL',
    });

    const rows = [];
    for (const org of base.data) {
      const [projectCount, taskCount, storageUsed, lastActive, sub] = await Promise.all([
        this.projectRepo.count({ where: { organizationId: org.id } }),
        this.taskRepo.count({ where: { organizationId: org.id } }),
        this.userRepo
          .createQueryBuilder('u')
          .select('COALESCE(SUM(CAST(u.storage_used AS UNSIGNED)), 0)', 'total')
          .where(
            'u.id IN (SELECT om.user_id FROM organization_members om WHERE om.organization_id = UUID_TO_BIN(:orgId))',
            { orgId: org.id },
          )
          .getRawOne<{ total: string }>(),
        this.userRepo
          .createQueryBuilder('u')
          .select('MAX(u.last_seen_at)', 'lastSeenAt')
          .where(
            'u.id IN (SELECT om.user_id FROM organization_members om WHERE om.organization_id = UUID_TO_BIN(:orgId))',
            { orgId: org.id },
          )
          .getRawOne<{ lastSeenAt: string | null }>(),
        this.billingService.getSubscriptionForOrganization(org.id),
      ]);

      if (query.plan && sub?.plan?.slug !== query.plan) continue;
      if (query.createdFrom && new Date(org.createdAt) < new Date(query.createdFrom)) continue;
      if (query.createdTo && new Date(org.createdAt) > new Date(query.createdTo)) continue;

      rows.push({
        ...org,
        tenantName: org.name,
        plan: org.planSlug ?? 'free',
        workspaces: 1,
        users: org.memberCount,
        projects: projectCount,
        tasks: taskCount,
        storageUsed: Number(storageUsed?.total ?? 0),
        lastActive: lastActive?.lastSeenAt ?? null,
      });
    }

    return {
      data: rows,
      meta: base.meta,
    };
  }

  async tenantById(id: string) {
    const detail = await this.adminService.getOrganization(id);
    const [projects, tasks, users, invoices] = await Promise.all([
      this.projectRepo.find({ where: { organizationId: id }, order: { createdAt: 'DESC' }, take: 100 }),
      this.taskRepo.find({ where: { organizationId: id }, order: { createdAt: 'DESC' }, take: 100 }),
      this.orgMemberRepo
        .createQueryBuilder('om')
        .leftJoinAndSelect('om.user', 'user')
        .where('om.organizationId = :organizationId', { organizationId: id })
        .getMany(),
      this.billingService.getInvoicesForOrganization(id),
    ]);

    return {
      overview: detail,
      workspaces: [{ id, name: detail.name, status: detail.status }],
      projects,
      tasks,
      users: users.map((m) => ({
        id: m.userId,
        role: m.role,
        status: m.status,
        fullName: m.user?.fullName ?? null,
        email: m.user?.email ?? null,
      })),
      billingHistory: invoices,
      storageUsage: detail.usage.storageGb,
    };
  }

  async setTenantStatus(id: string, status: 'ACTIVE' | 'SUSPENDED', reason?: string) {
    if (status === 'ACTIVE') {
      const data = await this.adminService.unsuspendOrganization(id);
      await this.log('organization', id, 'tenant.activate', null, { reason: reason ?? null });
      return data;
    }
    const data = await this.adminService.suspendOrganization(id, reason);
    await this.log('organization', id, 'tenant.suspend', null, { reason: reason ?? null });
    return data;
  }

  async deleteTenant(id: string) {
    const res = await this.adminService.deleteOrganizationPermanently(id);
    await this.log('organization', id, 'tenant.delete', id, {
      deletedUserIds: res.deletedUserIds,
    });
    return res;
  }

  async users(query: SuperAdminUserQueryDto) {
    const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10) || 20));
    const qb = this.userRepo.createQueryBuilder('u');
    if (query.search?.trim()) {
      qb.where('(u.full_name LIKE :s OR u.email LIKE :s)', { s: `%${query.search.trim()}%` });
    }
    if (query.status === 'active') qb.andWhere('u.is_active = 1');
    if (query.status === 'inactive') qb.andWhere('u.is_active = 0');
    if (query.platformAdmin === 'true') qb.andWhere('u.is_platform_admin = 1');
    if (query.platformAdmin === 'false') qb.andWhere('u.is_platform_admin = 0');
    const [items, total] = await qb
      .orderBy('u.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const data = await Promise.all(
      items.map(async (u) => {
        const membership = await this.orgMemberRepo.findOne({
          where: { userId: u.id },
          order: { joinedAt: 'DESC' },
        });
        const org =
          membership?.organizationId
            ? await this.orgRepo.findOne({ where: { id: membership.organizationId } })
            : null;
        return {
          id: u.id,
          name: u.fullName,
          email: u.email,
          role: membership?.role ?? null,
          tenant: org?.name ?? null,
          workspace: org?.name ?? null,
          status: u.isActive ? 'ACTIVE' : 'DISABLED',
          lastLogin: u.lastSeenAt,
          createdAt: u.createdAt,
          isPlatformAdmin: u.isPlatformAdmin,
        };
      }),
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async setUserActive(userId: string, active: boolean) {
    return this.adminService.setUserActive(userId, active);
  }

  async deleteUser(userId: string) {
    return this.adminService.deleteUserCompletely(userId);
  }

  async plans() {
    const [billingPlans, userPlanConfigs] = await Promise.all([
      this.planRepo.find({ order: { displayOrder: 'ASC' } }),
      this.planConfigurationsService.getAll(),
    ]);
    return { billingPlans, userPlanConfigs };
  }

  async upsertPlan(dto: SuperAdminPlanUpsertDto) {
    let plan = dto.id ? await this.planRepo.findOne({ where: { id: dto.id } }) : null;
    if (!plan) {
      const bySlug = await this.planRepo.findOne({ where: { slug: dto.slug } });
      if (bySlug) plan = bySlug;
    }
    if (!plan) {
      plan = this.planRepo.create({
        id: generateUuid(),
        slug: dto.slug.toLowerCase(),
        name: dto.name,
        billingCycle: 'monthly',
        displayOrder: 0,
      });
    }
    plan.name = dto.name;
    plan.slug = dto.slug.toLowerCase();
    plan.priceMonthly = dto.priceMonthly;
    plan.priceYearly = dto.priceYearly;
    plan.currency = dto.currency || 'INR';
    plan.maxUsers = dto.maxUsers ?? null;
    plan.maxProjects = dto.maxProjects ?? null;
    plan.maxTasks = dto.maxTasks ?? null;
    plan.storageLimitGb = dto.maxStorageGb ?? null;
    plan.trialDays = dto.trialDays ?? plan.trialDays ?? 0;
    if (typeof dto.isActive === 'boolean') plan.isActive = dto.isActive;
    await this.planRepo.save(plan);
    await this.log('plan', plan.id, 'plan.upsert', null, { slug: plan.slug });
    return plan;
  }

  async deletePlan(planId: string) {
    const plan = await this.planRepo.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');
    plan.isActive = false;
    await this.planRepo.save(plan);
    await this.log('plan', plan.id, 'plan.disable', null, {});
    return { success: true };
  }

  async subscriptions() {
    const subs = await this.subscriptionRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['plan', 'organization'],
      take: 300,
    });
    return subs.map((s) => ({
      id: s.id,
      tenant: s.organization?.name ?? s.organizationId,
      plan: s.plan?.name ?? s.planId,
      amount: Number(s.plan?.priceMonthly ?? 0),
      startDate: s.startDate,
      expiryDate: s.endDate,
      status: s.status,
      billingCycle: s.billingCycle,
      organizationId: s.organizationId,
    }));
  }

  async subscriptionAction(dto: SuperAdminSubscriptionActionDto) {
    const sub = await this.subscriptionRepo.findOne({
      where: { organizationId: dto.organizationId },
      relations: ['plan'],
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    if (dto.planId) sub.planId = dto.planId;
    if (dto.billingCycle) sub.billingCycle = dto.billingCycle;
    if (dto.status) sub.status = dto.status;
    await this.subscriptionRepo.save(sub);
    await this.log('subscription', sub.id, 'subscription.update', dto.organizationId, {
      ...dto,
    });
    return sub;
  }

  async globalAuditLogs(query: {
    userId?: string;
    organizationId?: string;
    entity?: string;
    action?: string;
    from?: string;
    to?: string;
    page?: string;
    limit?: string;
  }) {
    const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(query.limit ?? '50', 10) || 50));
    const qb = this.globalAuditRepo.createQueryBuilder('l');
    if (query.userId) qb.andWhere('l.actor_user_id = UUID_TO_BIN(:userId)', { userId: query.userId });
    if (query.organizationId)
      qb.andWhere('l.organization_id = UUID_TO_BIN(:organizationId)', { organizationId: query.organizationId });
    if (query.entity) qb.andWhere('l.entity_type = :entity', { entity: query.entity });
    if (query.action) qb.andWhere('l.action = :action', { action: query.action });
    if (query.from) qb.andWhere('l.created_at >= :from', { from: query.from });
    if (query.to) qb.andWhere('l.created_at <= :to', { to: query.to });

    const [data, total] = await qb
      .orderBy('l.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      data,
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async analytics() {
    const dashboard = await this.dashboard();
    return {
      revenueGrowth: dashboard.charts.revenueGrowth,
      tenantGrowth: dashboard.charts.workspaceCreationAnalytics,
      userGrowth: dashboard.charts.monthlyRegistrations,
      subscriptionGrowth: dashboard.charts.subscriptionAnalytics,
      storageConsumption: dashboard.charts.storageUsageAnalytics,
      activeVsInactiveTenants: {
        active: dashboard.activeTenants,
        inactive: dashboard.suspendedTenants,
      },
    };
  }

  async listSettings() {
    return this.settingRepo.find({ order: { settingKey: 'ASC' } });
  }

  async upsertSetting(dto: SuperAdminSettingsUpdateDto) {
    let row = await this.settingRepo.findOne({ where: { settingKey: dto.settingKey } });
    if (!row) {
      row = this.settingRepo.create({
        settingKey: dto.settingKey,
      });
    }
    row.settingValue = (dto.settingValue as Record<string, unknown> | string | number | boolean | null) ?? null;
    const saved = await this.settingRepo.save(row);
    await this.log('setting', String(saved.id), 'setting.upsert', null, {
      key: dto.settingKey,
    });
    return saved;
  }

  async sendNotification(adminUserId: string, dto: SuperAdminSendNotificationDto) {
    if (dto.targetScope !== 'all' && (!dto.targetOrganizationIds || dto.targetOrganizationIds.length === 0)) {
      throw new BadRequestException('targetOrganizationIds required for single/multiple target scopes');
    }
    const row = this.notificationRepo.create({
      targetScope: dto.targetScope,
      targetOrganizationIds: dto.targetOrganizationIds ?? null,
      title: dto.title,
      message: dto.message,
      sentBy: adminUserId,
    });
    const saved = await this.notificationRepo.save(row);
    await this.log('notification', String(saved.id), 'notification.send', null, {
      targetScope: dto.targetScope,
    });
    return saved;
  }

  async impersonate(adminUserId: string, dto: SuperAdminImpersonateDto) {
    const target = await this.userRepo.findOne({ where: { id: dto.targetUserId } });
    if (!target) throw new NotFoundException('Target user not found');
    if (target.isPlatformAdmin) {
      throw new BadRequestException('Cannot impersonate another platform admin');
    }

    const sessionId = crypto.randomUUID();
    const log = this.impersonationRepo.create({
      sessionId,
      adminUserId,
      targetUserId: dto.targetUserId,
      targetOrganizationId: dto.targetOrganizationId ?? null,
      reason: dto.reason ?? null,
      startedAt: new Date(),
    });
    await this.impersonationRepo.save(log);

    const token = await this.authService.issueCustomToken({
      sub: target.id,
      email: target.email,
      actorUserId: adminUserId,
      impersonationSessionId: sessionId,
      impersonating: true,
      targetOrganizationId: dto.targetOrganizationId ?? undefined,
      roles: ['SUPER_ADMIN_IMPERSONATION'],
    });
    await this.log('impersonation', sessionId, 'impersonation.start', dto.targetOrganizationId ?? null, {
      targetUserId: dto.targetUserId,
      reason: dto.reason ?? null,
    });
    return { sessionId, token };
  }

  async stopImpersonation(adminUserId: string, sessionId: string) {
    const log = await this.impersonationRepo.findOne({ where: { sessionId } });
    if (!log) throw new NotFoundException('Impersonation session not found');
    if (log.adminUserId !== adminUserId) {
      throw new BadRequestException('Cannot stop another admin impersonation session');
    }
    log.endedAt = new Date();
    await this.impersonationRepo.save(log);
    await this.log('impersonation', sessionId, 'impersonation.end', log.targetOrganizationId, {
      targetUserId: log.targetUserId,
    });
    return { success: true };
  }

  private async log(
    entityType: string,
    entityId: string | null,
    action: string,
    organizationId: string | null,
    metadata: Record<string, unknown>,
    actorUserId?: string | null,
  ) {
    await this.globalAuditRepo.save(
      this.globalAuditRepo.create({
        entityType,
        entityId,
        action,
        organizationId,
        actorUserId: actorUserId ?? null,
        metadata,
      }),
    );
  }
}

