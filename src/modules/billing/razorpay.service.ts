import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

// Razorpay uses CommonJS module.exports - default import fails at runtime
const Razorpay = require('razorpay') as new (options: { key_id: string; key_secret: string }) => {
  orders: { create: (params: unknown) => Promise<unknown> };
  payments: { fetch: (id: string) => Promise<unknown>; refund: (id: string, params?: unknown) => Promise<unknown> };
};

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

@Injectable()
export class RazorpayService {
  private readonly razorpay: InstanceType<typeof Razorpay>;
  private readonly logger = new Logger(RazorpayService.name);
  private readonly keyId: string;
  private readonly keySecret: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_SKnj58Qr1OY0FK';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || 'HldpEAu7h8FFF3OkXCzl4IAO';

    this.razorpay = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });

    this.logger.log('Razorpay initialized with key: ' + this.keyId.slice(0, 12) + '...');
  }

  getKeyId(): string {
    return this.keyId;
  }

  /**
   * Create a Razorpay order for one-time payment
   */
  async createOrder(params: {
    amount: number; // in paise (e.g., 34900 for ₹349)
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<RazorpayOrder> {
    try {
      const order = (await this.razorpay.orders.create({
        amount: params.amount,
        currency: params.currency,
        receipt: params.receipt,
        notes: params.notes || {},
      })) as RazorpayOrder;

      this.logger.log(`Razorpay order created: ${order.id} for ₹${params.amount / 100}`);
      return order;
    } catch (error) {
      this.logger.error('Failed to create Razorpay order', error);
      throw error;
    }
  }

  /**
   * Verify payment signature from Razorpay callback
   */
  verifyPaymentSignature(params: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    const body = params.orderId + '|' + params.paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');

    return expectedSignature === params.signature;
  }

  /**
   * Fetch payment details from Razorpay
   */
  async fetchPayment(paymentId: string): Promise<Record<string, unknown>> {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment as unknown as Record<string, unknown>;
    } catch (error) {
      this.logger.error(`Failed to fetch payment ${paymentId}`, error);
      throw error;
    }
  }

  /**
   * Issue refund
   */
  async refundPayment(paymentId: string, amount?: number): Promise<Record<string, unknown>> {
    try {
      const refund = await this.razorpay.payments.refund(paymentId, {
        amount: amount,
      } as any);
      this.logger.log(`Refund issued for payment ${paymentId}`);
      return refund as unknown as Record<string, unknown>;
    } catch (error) {
      this.logger.error(`Failed to refund payment ${paymentId}`, error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return expectedSignature === signature;
  }
}
