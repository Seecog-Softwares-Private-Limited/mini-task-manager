import { SubscriptionEntity } from './subscription.entity';
export declare class InvoiceEntity {
    id: string;
    subscriptionId: string;
    amount: string;
    status: string;
    issuedAt: Date;
    paidAt: Date | null;
    subscription?: SubscriptionEntity;
}
