import { BillingService } from './billing.service';
import { PlanResponseDto } from './dto/plan-response.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
export declare class BillingController {
    private readonly billingService;
    constructor(billingService: BillingService);
    getPlans(): Promise<PlanResponseDto[]>;
    getSubscription(tenantId?: string): Promise<SubscriptionResponseDto | null>;
    getInvoices(tenantId?: string): Promise<InvoiceResponseDto[]>;
}
