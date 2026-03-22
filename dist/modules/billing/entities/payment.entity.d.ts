import { SubscriptionEntity } from './subscription.entity';
export declare class PaymentEntity {
    id: string;
    subscriptionId: string;
    amount: number;
    currency: string;
    status: string;
    razorpayPaymentId: string | null;
    razorpayOrderId: string | null;
    razorpaySignature: string | null;
    method: string | null;
    metadata: Record<string, unknown> | null;
    paidAt: Date | null;
    createdAt: Date;
    subscription?: SubscriptionEntity;
}
