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
var SmsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
const common_1 = require("@nestjs/common");
const twilio = require("twilio");
let SmsService = SmsService_1 = class SmsService {
    constructor() {
        this.logger = new common_1.Logger(SmsService_1.name);
        this.client = null;
        this.fromNumber = null;
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        this.fromNumber = process.env.TWILIO_PHONE_NUMBER || null;
        if (accountSid && authToken) {
            this.client = twilio(accountSid, authToken);
            this.logger.log('Twilio SMS service configured');
        }
        else {
            this.logger.warn('Twilio not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN). OTP will not be sent.');
        }
    }
    async sendOtp(to, code) {
        if (!this.client || !this.fromNumber) {
            this.logger.warn('SMS not configured; OTP would have been: ' + code);
            return false;
        }
        const normalized = this.normalizePhone(to);
        if (!normalized) {
            return false;
        }
        try {
            await this.client.messages.create({
                body: `Your Mini Task Manager verification code is: ${code}. Valid for 10 minutes.`,
                from: this.fromNumber,
                to: normalized,
            });
            this.logger.log(`OTP sent to ${normalized}`);
            return true;
        }
        catch (err) {
            this.logger.error(`Failed to send OTP to ${normalized}: ${err}`);
            throw err;
        }
    }
    normalizePhone(phone) {
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 10)
            return null;
        return digits.startsWith('0') ? null : (digits.length === 10 ? '+1' + digits : '+' + digits);
    }
};
exports.SmsService = SmsService;
exports.SmsService = SmsService = SmsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], SmsService);
//# sourceMappingURL=sms.service.js.map