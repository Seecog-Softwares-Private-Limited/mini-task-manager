import { Controller, Get, Post, Body, UseGuards, Req, RawBodyRequest, Headers, HttpCode } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { PlanResponseDto } from './dto/plan-response.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { UsageResponseDto, UsageBucketDto } from './dto/usage-response.dto';
import { CreateOrderDto, VerifyPaymentDto, StartTrialDto, CancelSubscriptionDto } from './dto/billing-request.dto';
import type { Request } from 'express';

function toUsageBucket(current: number, limit: number | null): UsageBucketDto {
  return {
    current,
    limit,
    percentage: limit != null && limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : null,
  };
}

@Controller('billing')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ── GET /billing/plans (public — needed for landing/pricing before login) ──
  @Public()
  @Get('plans')
  async getPlans(): Promise<PlanResponseDto[]> {
    const plans = await this.billingService.getPlans();
    return plans.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      priceMonthly: Number(p.priceMonthly),
      priceYearly: Number(p.priceYearly),
      currency: p.currency,
      maxUsers: p.maxUsers,
      maxProjects: p.maxProjects,
      storageLimitGb: p.storageLimitGb,
      automationLimit: p.automationLimit,
      integrationLimit: p.integrationLimit,
      maxApiKeys: p.maxApiKeys ?? null,
      apiEnabled: p.apiEnabled,
      ssoEnabled: p.ssoEnabled,
      auditLogsEnabled: p.auditLogsEnabled,
      customWorkflows: p.customWorkflows,
      advancedReporting: p.advancedReporting,
      timeTracking: p.timeTracking,
      prioritySupport: p.prioritySupport,
      slaUptime: p.slaUptime,
      features: p.features ?? undefined,
      isPopular: p.isPopular,
      displayOrder: p.displayOrder,
    }));
  }

  // ── GET /billing/subscription ──
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  @Get('subscription')
  async getSubscription(@TenantId() tenantId?: string): Promise<SubscriptionResponseDto | null> {
    const sub = await this.billingService.getSubscriptionForOrganization(tenantId!);
    if (!sub) return null;

    // Always fetch plan fresh by ID — never trust sub.plan which may be stale after mutations
    const plan = await this.billingService.getPlanById(sub.planId);
    const now = new Date();
    const isTrialExpired = sub.status === 'TRIAL' && sub.trialEndsAt && new Date(sub.trialEndsAt) <= now;
    
    let daysRemaining: number | undefined;
    if (sub.endDate) {
      daysRemaining = Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }
    if (sub.status === 'TRIAL' && sub.trialEndsAt) {
      daysRemaining = Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    return {
      id: sub.id,
      organizationId: sub.organizationId,
      planId: sub.planId,
      planSlug: plan?.slug ?? 'free',
      planName: plan?.name ?? 'Free',
      billingCycle: sub.billingCycle,
      status: isTrialExpired ? 'EXPIRED' : sub.status,
      startDate: sub.startDate ?? undefined,
      endDate: sub.endDate ?? undefined,
      trialEndsAt: sub.trialEndsAt ?? undefined,
      cancelledAt: sub.cancelledAt ?? undefined,
      razorpaySubscriptionId: sub.razorpaySubscriptionId ?? undefined,
      daysRemaining,
      isTrialExpired: isTrialExpired ?? false,
    };
  }

  // ── GET /billing/usage ──
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  @Get('usage')
  async getUsage(@TenantId() tenantId?: string): Promise<UsageResponseDto> {
    const [usage, sub] = await Promise.all([
      this.billingService.getUsage(tenantId!),
      this.billingService.getSubscriptionForOrganization(tenantId!),
    ]);

    const plan = sub?.planId ? await this.billingService.getPlanById(sub.planId) : null;
    const isTrial = sub?.status === 'TRIAL';
    const isTrialExpired = isTrial && sub?.trialEndsAt && new Date(sub.trialEndsAt) <= new Date();

    return {
      users: toUsageBucket(usage.users.current, usage.users.limit),
      projects: toUsageBucket(usage.projects.current, usage.projects.limit),
      storageGb: toUsageBucket(usage.storageGb.current, usage.storageGb.limit),
      automations: toUsageBucket(usage.automations.current, usage.automations.limit),
      integrations: toUsageBucket(usage.integrations.current, usage.integrations.limit),
      apiKeys: toUsageBucket(usage.apiKeys.current, usage.apiKeys.limit),
      planName: plan?.name ?? null,
      planSlug: plan?.slug ?? null,
      subscriptionStatus: isTrialExpired ? 'EXPIRED' : (sub?.status ?? null),
      billingCycle: sub?.billingCycle ?? null,
      isTrial: isTrial && !isTrialExpired,
      trialEndsAt: sub?.trialEndsAt ?? null,
      isTrialExpired: isTrialExpired ?? false,
    };
  }

  // ── GET /billing/usage/indicator ──
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  @Get('usage/indicator')
  async getUsageIndicator(@TenantId() tenantId?: string) {
    const [usage, sub] = await Promise.all([
      this.billingService.getUsage(tenantId!),
      this.billingService.getSubscriptionForOrganization(tenantId!),
    ]);
    const plan = sub?.planId ? await this.billingService.getPlanById(sub.planId) : null;
    const isTrial = sub?.status === 'TRIAL';
    const isTrialExpired = isTrial && sub?.trialEndsAt && new Date(sub.trialEndsAt) <= new Date();
    const anyAtLimit =
      (usage.users.limit != null && usage.users.current >= usage.users.limit) ||
      (usage.projects.limit != null && usage.projects.current >= usage.projects.limit) ||
      (usage.storageGb.limit != null && usage.storageGb.current >= usage.storageGb.limit);

    return {
      planName: plan?.name ?? null,
      planSlug: plan?.slug ?? null,
      isTrial: isTrial && !isTrialExpired,
      isTrialExpired: isTrialExpired ?? false,
      trialEndsAt: sub?.trialEndsAt ?? null,
      atLimit: anyAtLimit,
      users: { current: usage.users.current, limit: usage.users.limit },
      projects: { current: usage.projects.current, limit: usage.projects.limit },
      storageGb: { current: usage.storageGb.current, limit: usage.storageGb.limit },
    };
  }

  // ── GET /billing/features ──
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  @Get('features')
  async getFeatureFlags(@TenantId() tenantId?: string): Promise<Record<string, unknown>> {
    return this.billingService.getFeatureFlags(tenantId!);
  }

  // ── GET /billing/invoices ──
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  @Get('invoices')
  async getInvoices(@TenantId() tenantId?: string): Promise<InvoiceResponseDto[]> {
    const invoices = await this.billingService.getInvoicesForOrganization(tenantId!);
    return invoices.map((i) => ({
      id: i.id,
      subscriptionId: i.subscriptionId,
      amount: Number(i.amount),
      currency: i.currency,
      status: i.status,
      billingCycle: i.billingCycle,
      planName: i.planName,
      userCount: i.userCount,
      issuedAt: i.issuedAt,
      dueDate: i.dueDate ?? undefined,
      paidAt: i.paidAt ?? undefined,
    }));
  }

  // ── POST /billing/trial/start ──
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  @Post('trial/start')
  async startTrial(
    @TenantId() tenantId: string,
    @Body() body: StartTrialDto,
  ): Promise<SubscriptionResponseDto> {
    const sub = await this.billingService.startTrial(tenantId, body.planId || 'pro');
    const plan = await this.billingService.getPlanById(sub.planId);
    return {
      id: sub.id,
      organizationId: sub.organizationId,
      planId: sub.planId,
      planSlug: plan?.slug ?? 'free',
      planName: plan?.name ?? 'Free',
      billingCycle: sub.billingCycle,
      status: sub.status,
      startDate: sub.startDate ?? undefined,
      endDate: sub.endDate ?? undefined,
      trialEndsAt: sub.trialEndsAt ?? undefined,
      daysRemaining: 14,
    };
  }

  // ── POST /billing/create-order ──
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  @Post('create-order')
  async createOrder(
    @TenantId() tenantId: string,
    @Body() body: CreateOrderDto,
  ) {
    return this.billingService.createOrder(tenantId, body.planId, body.billingCycle);
  }

  // ── POST /billing/verify-payment ──
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  @Post('verify-payment')
  async verifyPayment(
    @TenantId() tenantId: string,
    @Body() body: VerifyPaymentDto,
  ): Promise<SubscriptionResponseDto> {
    const sub = await this.billingService.verifyPayment({
      organizationId: tenantId,
      razorpayOrderId: body.razorpay_order_id,
      razorpayPaymentId: body.razorpay_payment_id,
      razorpaySignature: body.razorpay_signature,
      planId: body.planId,
      billingCycle: body.billingCycle,
    });

    // Always fetch plan fresh — sub.plan may be stale after verifyPayment save
    const plan = await this.billingService.getPlanById(sub.planId);
    return {
      id: sub.id,
      organizationId: sub.organizationId,
      planId: sub.planId,
      planSlug: plan?.slug ?? 'unknown',
      planName: plan?.name ?? 'Unknown',
      billingCycle: sub.billingCycle,
      status: sub.status,
      startDate: sub.startDate ?? undefined,
      endDate: sub.endDate ?? undefined,
    };
  }

  // ── POST /billing/cancel ──
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  @Post('cancel')
  async cancelSubscription(
    @TenantId() tenantId: string,
    @Body() body: CancelSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    const sub = await this.billingService.cancelSubscription(tenantId);
    const plan = await this.billingService.getPlanById(sub.planId);
    return {
      id: sub.id,
      organizationId: sub.organizationId,
      planId: sub.planId,
      planSlug: plan?.slug ?? 'free',
      planName: plan?.name ?? 'Free',
      billingCycle: sub.billingCycle,
      status: sub.status,
      startDate: sub.startDate ?? undefined,
      endDate: sub.endDate ?? undefined,
    };
  }

  // ── POST /billing/downgrade ──
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  @Post('downgrade')
  async downgradeToFree(@TenantId() tenantId: string): Promise<SubscriptionResponseDto> {
    const sub = await this.billingService.downgradeToFree(tenantId);
    return {
      id: sub.id,
      organizationId: sub.organizationId,
      planId: sub.planId,
      planSlug: 'free',
      planName: 'Free',
      billingCycle: sub.billingCycle,
      status: sub.status,
      startDate: sub.startDate ?? undefined,
    };
  }

  // ── POST /billing/webhook (Razorpay webhook) ──
  @Post('webhook')
  @HttpCode(200)
  @SkipThrottle()
  async handleWebhook(
    @Req() req: Request,
    @Headers('x-razorpay-signature') signature: string,
    @Body() body: any,
  ) {
    // Webhook handling for Razorpay events
    // This would be used in production for handling subscription renewals, failures, etc.
    return { status: 'ok' };
  }
}
