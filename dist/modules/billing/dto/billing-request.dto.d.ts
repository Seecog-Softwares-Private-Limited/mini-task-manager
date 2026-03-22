export declare class CreateOrderDto {
    planId: string;
    billingCycle: 'monthly' | 'yearly';
}
export declare class VerifyPaymentDto {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    planId: string;
    billingCycle: 'monthly' | 'yearly';
}
export declare class StartTrialDto {
    planId?: string;
}
export declare class CancelSubscriptionDto {
    reason?: string;
}
