import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

// Razorpay uses CommonJS module.exports - default import fails at runtime
const Razorpay = require('razorpay') as new (options: { key_id: string; key_secret: string }) => {
  orders: { create: (params: unknown) => Promise<unknown> };
  payments: { fetch: (id: string) => Promise<unknown>; refund: (id: string, params?: unknown) => Promise<unknown> };
  customers: { create: (params: unknown) => Promise<unknown> };
  plans: { create: (params: unknown) => Promise<unknown>; fetch: (id: string) => Promise<unknown> };
  subscriptions: {
    create: (params: unknown) => Promise<unknown>;
    fetch: (id: string) => Promise<unknown>;
    cancel: (id: string, params?: unknown) => Promise<unknown>;
  };
};

/** Normalize Razorpay / HTTP errors from the Node SDK into a readable message + optional statusCode. */
export function parseRazorpayFailure(err: unknown): { message: string; statusCode?: number } {
  if (err == null) return { message: 'Unknown Razorpay error' };
  if (typeof err === 'string') return { message: err };
  if (!(typeof err === 'object')) return { message: String(err) };
  const e = err as Record<string, unknown>;
  const statusCode = typeof e.statusCode === 'number' ? e.statusCode : undefined;
  if (typeof e.description === 'string' && e.description) {
    return { message: e.description, statusCode };
  }
  const nested = e.error;
  if (nested && typeof nested === 'object') {
    const ne = nested as Record<string, unknown>;
    if (typeof ne.description === 'string' && ne.description) {
      return { message: ne.description, statusCode };
    }
    if (typeof ne.code === 'string') {
      return { message: typeof e.message === 'string' ? `${ne.code}: ${e.message}` : ne.code, statusCode };
    }
  }
  if (typeof e.message === 'string' && e.message) {
    return { message: e.message, statusCode };
  }
  return { message: 'Razorpay request failed', statusCode };
}

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
    this.keyId = (process.env.RAZORPAY_KEY_ID || 'rzp_test_SKnj58Qr1OY0FK').trim();
    this.keySecret = (process.env.RAZORPAY_KEY_SECRET || 'HldpEAu7h8FFF3OkXCzl4IAO').trim();

    this.razorpay = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });

    const fromEnv = !!(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim());
    if (!fromEnv && process.env.NODE_ENV !== 'production') {
      this.logger.warn(
        'Razorpay: using fallback test keys from code. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env (Razorpay Dashboard → API Keys). Revoked keys cause create-order to fail.',
      );
    }
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
      const { message, statusCode } = parseRazorpayFailure(error);
      this.logger.error(`Failed to create Razorpay order: ${message}`, error instanceof Error ? error.stack : String(error));
      const wrapped = new Error(message) as Error & { statusCode?: number; cause?: unknown };
      wrapped.statusCode = statusCode;
      wrapped.cause = error;
      throw wrapped;
    }
  }

  /**
   * Verify payment signature from Razorpay callback (one-time order).
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
   * Verify checkout signature for a Razorpay Subscription
   * (`subscription_id|payment_id`).
   */
  verifySubscriptionSignature(params: {
    subscriptionId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    const body = params.subscriptionId + '|' + params.paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');
    return expectedSignature === params.signature;
  }

  async createCustomer(params: {
    name: string;
    email: string;
    contact?: string;
    notes?: Record<string, string>;
  }): Promise<{ id: string }> {
    try {
      const customer = (await this.razorpay.customers.create({
        name: params.name,
        email: params.email,
        contact: params.contact || undefined,
        notes: params.notes || {},
        fail_existing: 0,
      })) as { id: string };
      return customer;
    } catch (error) {
      const { message, statusCode } = parseRazorpayFailure(error);
      this.logger.error(`Failed to create Razorpay customer: ${message}`);
      const wrapped = new Error(message) as Error & { statusCode?: number };
      wrapped.statusCode = statusCode;
      throw wrapped;
    }
  }

  async createPlan(params: {
    name: string;
    amountPaise: number;
    currency?: string;
    period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    description?: string;
  }): Promise<{ id: string }> {
    try {
      const plan = (await this.razorpay.plans.create({
        period: params.period ?? 'monthly',
        interval: params.interval ?? 1,
        item: {
          name: params.name,
          amount: params.amountPaise,
          currency: params.currency ?? 'INR',
          description: params.description ?? params.name,
        },
      })) as { id: string };
      this.logger.log(`Razorpay plan created: ${plan.id} (${params.name})`);
      return plan;
    } catch (error) {
      const { message, statusCode } = parseRazorpayFailure(error);
      this.logger.error(`Failed to create Razorpay plan: ${message}`);
      const wrapped = new Error(message) as Error & { statusCode?: number };
      wrapped.statusCode = statusCode;
      throw wrapped;
    }
  }

  async fetchPlan(planId: string): Promise<{ id: string; item?: { amount?: number } }> {
    const plan = (await this.razorpay.plans.fetch(planId)) as {
      id: string;
      item?: { amount?: number };
    };
    return plan;
  }

  async createSubscription(params: {
    planId: string;
    customerId?: string;
    totalCount?: number;
    notes?: Record<string, string>;
  }): Promise<{ id: string; status: string }> {
    try {
      const subscription = (await this.razorpay.subscriptions.create({
        plan_id: params.planId,
        customer_id: params.customerId || undefined,
        total_count: params.totalCount ?? 120,
        quantity: 1,
        customer_notify: 0,
        notes: params.notes || {},
      })) as { id: string; status: string };
      this.logger.log(`Razorpay subscription created: ${subscription.id}`);
      return subscription;
    } catch (error) {
      const { message, statusCode } = parseRazorpayFailure(error);
      this.logger.error(`Failed to create Razorpay subscription: ${message}`);
      const wrapped = new Error(message) as Error & { statusCode?: number };
      wrapped.statusCode = statusCode;
      throw wrapped;
    }
  }

  async fetchSubscription(subscriptionId: string): Promise<Record<string, unknown>> {
    return (await this.razorpay.subscriptions.fetch(subscriptionId)) as Record<string, unknown>;
  }

  async cancelSubscription(subscriptionId: string, cancelAtCycleEnd = false): Promise<void> {
    try {
      await this.razorpay.subscriptions.cancel(subscriptionId, {
        cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0,
      });
      this.logger.log(`Razorpay subscription cancelled: ${subscriptionId}`);
    } catch (error) {
      const { message } = parseRazorpayFailure(error);
      this.logger.warn(`Failed to cancel Razorpay subscription ${subscriptionId}: ${message}`);
    }
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
