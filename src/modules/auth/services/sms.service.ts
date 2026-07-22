import { Injectable, Logger } from '@nestjs/common';
import * as twilio from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: twilio.Twilio | null = null;
  private fromNumber: string | null = null;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || null;

    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
      this.logger.log('Twilio SMS service configured');
    } else {
      this.logger.warn('Twilio not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN). OTP will not be sent.');
    }
  }

  async sendOtp(to: string, code: string): Promise<boolean> {
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
        body: `Your OpsPick verification code is: ${code}. Valid for 10 minutes.`,
        from: this.fromNumber,
        to: normalized,
      });
      this.logger.log(`OTP sent to ${normalized}`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to send OTP to ${normalized}: ${err}`);
      throw err;
    }
  }

  /** Normalize to E.164 format. Expects digits, optionally with + prefix. */
  normalizePhone(phone: string): string | null {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) return null;
    return digits.startsWith('0') ? null : (digits.length === 10 ? '+1' + digits : '+' + digits);
  }
}
