"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RazorpayService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RazorpayService = void 0;
const common_1 = require("@nestjs/common");
const crypto = require("crypto");
const Razorpay = require('razorpay');
let RazorpayService = RazorpayService_1 = class RazorpayService {
    constructor() {
        this.logger = new common_1.Logger(RazorpayService_1.name);
        this.keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_SKnj58Qr1OY0FK';
        this.keySecret = process.env.RAZORPAY_KEY_SECRET || 'HldpEAu7h8FFF3OkXCzl4IAO';
        this.razorpay = new Razorpay({
            key_id: this.keyId,
            key_secret: this.keySecret,
        });
        this.logger.log('Razorpay initialized with key: ' + this.keyId.slice(0, 12) + '...');
    }
    getKeyId() {
        return this.keyId;
    }
    async createOrder(params) {
        try {
            const order = (await this.razorpay.orders.create({
                amount: params.amount,
                currency: params.currency,
                receipt: params.receipt,
                notes: params.notes || {},
            }));
            this.logger.log(`Razorpay order created: ${order.id} for ₹${params.amount / 100}`);
            return order;
        }
        catch (error) {
            this.logger.error('Failed to create Razorpay order', error);
            throw error;
        }
    }
    verifyPaymentSignature(params) {
        const body = params.orderId + '|' + params.paymentId;
        const expectedSignature = crypto
            .createHmac('sha256', this.keySecret)
            .update(body)
            .digest('hex');
        return expectedSignature === params.signature;
    }
    async fetchPayment(paymentId) {
        try {
            const payment = await this.razorpay.payments.fetch(paymentId);
            return payment;
        }
        catch (error) {
            this.logger.error(`Failed to fetch payment ${paymentId}`, error);
            throw error;
        }
    }
    async refundPayment(paymentId, amount) {
        try {
            const refund = await this.razorpay.payments.refund(paymentId, {
                amount: amount,
            });
            this.logger.log(`Refund issued for payment ${paymentId}`);
            return refund;
        }
        catch (error) {
            this.logger.error(`Failed to refund payment ${paymentId}`, error);
            throw error;
        }
    }
    verifyWebhookSignature(body, signature, secret) {
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(body)
            .digest('hex');
        return expectedSignature === signature;
    }
};
exports.RazorpayService = RazorpayService;
exports.RazorpayService = RazorpayService = RazorpayService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RazorpayService);
//# sourceMappingURL=razorpay.service.js.map