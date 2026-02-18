import { Controller, Get, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { PlanResponseDto } from './dto/plan-response.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';

@Controller('billing')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  async getPlans(): Promise<PlanResponseDto[]> {
    const plans = await this.billingService.getPlans();
    return plans.map((p) => ({
      id: p.id,
      name: p.name,
      pricePerUser: p.pricePerUser,
      billingCycle: p.billingCycle,
      maxProjects: p.maxProjects ?? undefined,
      maxMembers: p.maxMembers ?? undefined,
      features: p.features ?? undefined,
    }));
  }

  @UseGuards(TenantGuard)
  @Get('subscription')
  async getSubscription(@TenantId() tenantId?: string): Promise<SubscriptionResponseDto | null> {
    const sub = await this.billingService.getSubscriptionForOrganization(tenantId!);
    if (!sub) return null;
    return {
      id: sub.id,
      organizationId: sub.organizationId,
      planId: sub.planId,
      status: sub.status,
      startDate: sub.startDate ?? undefined,
      endDate: sub.endDate ?? undefined,
      trialEndsAt: sub.trialEndsAt ?? undefined,
    };
  }

  @UseGuards(TenantGuard)
  @Get('invoices')
  async getInvoices(@TenantId() tenantId?: string): Promise<InvoiceResponseDto[]> {
    const sub = await this.billingService.getSubscriptionForOrganization(tenantId!);
    if (!sub) return [];
    const invoices = await this.billingService.getInvoicesForSubscription(sub.id);
    return invoices.map((i) => ({
      id: i.id,
      subscriptionId: i.subscriptionId,
      amount: i.amount,
      status: i.status,
      issuedAt: i.issuedAt,
      paidAt: i.paidAt ?? undefined,
    }));
  }
}
