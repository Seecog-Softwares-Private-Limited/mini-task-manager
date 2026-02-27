export interface RazorpayOrder {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
    status: string;
}
export declare class RazorpayService {
    private readonly razorpay;
    private readonly logger;
    private readonly keyId;
    private readonly keySecret;
    constructor();
    getKeyId(): string;
    createOrder(params: {
        amount: number;
        currency: string;
        receipt: string;
        notes?: Record<string, string>;
    }): Promise<RazorpayOrder>;
    verifyPaymentSignature(params: {
        orderId: string;
        paymentId: string;
        signature: string;
    }): boolean;
    fetchPayment(paymentId: string): Promise<Record<string, unknown>>;
    refundPayment(paymentId: string, amount?: number): Promise<Record<string, unknown>>;
    verifyWebhookSignature(body: string, signature: string, secret: string): boolean;
}
