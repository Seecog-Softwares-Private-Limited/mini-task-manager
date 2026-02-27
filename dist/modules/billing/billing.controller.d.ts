import { BillingService } from './billing.service';
import { PlanResponseDto } from './dto/plan-response.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { UsageResponseDto } from './dto/usage-response.dto';
import { CreateOrderDto, VerifyPaymentDto, StartTrialDto, CancelSubscriptionDto } from './dto/billing-request.dto';
import type { Request } from 'express';
export declare class BillingController {
    private readonly billingService;
    constructor(billingService: BillingService);
    getPlans(): Promise<PlanResponseDto[]>;
    getSubscription(tenantId?: string): Promise<SubscriptionResponseDto | null>;
    getUsage(tenantId?: string): Promise<UsageResponseDto>;
    getUsageIndicator(tenantId?: string): Promise<{
        planName: string | null;
        planSlug: string | null;
        isTrial: boolean;
        isTrialExpired: boolean;
        trialEndsAt: Date | null;
        atLimit: boolean;
        users: {
            current: number;
            limit: number | null;
        };
        projects: {
            current: number;
            limit: number | null;
        };
        storageGb: {
            current: number;
            limit: number | null;
        };
    }>;
    getFeatureFlags(tenantId?: string): Promise<Record<string, unknown>>;
    getInvoices(tenantId?: string): Promise<InvoiceResponseDto[]>;
    startTrial(tenantId: string, body: StartTrialDto): Promise<SubscriptionResponseDto>;
    createOrder(tenantId: string, body: CreateOrderDto): Promise<{
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
        planName: string;
        billingCycle: string;
    }>;
    verifyPayment(tenantId: string, body: VerifyPaymentDto): Promise<SubscriptionResponseDto>;
    cancelSubscription(tenantId: string, body: CancelSubscriptionDto): Promise<SubscriptionResponseDto>;
    downgradeToFree(tenantId: string): Promise<SubscriptionResponseDto>;
    handleWebhook(req: Request, signature: string, body: any): Promise<{
        status: string;
    }>;
}
