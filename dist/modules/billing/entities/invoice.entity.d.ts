import { SubscriptionEntity } from './subscription.entity';
export declare class InvoiceEntity {
    id: string;
    subscriptionId: string;
    organizationId: string;
    amount: number;
    currency: string;
    status: string;
    billingCycle: string;
    planName: string;
    userCount: number;
    razorpayInvoiceId: string | null;
    issuedAt: Date;
    dueDate: Date | null;
    paidAt: Date | null;
    subscription?: SubscriptionEntity;
}
