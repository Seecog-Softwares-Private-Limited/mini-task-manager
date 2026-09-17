import { Injectable, Logger } from '@nestjs/common';
import * as twilio from 'twilio';

type SmsProvider = 'blacksms' | 'twilio' | 'none';

type BlackSmsResponse = {
  return?: boolean;
  request_id?: string;
  status?: number;
  message?: string | string[];
};

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private provider: SmsProvider = 'none';
  private twilioClient: twilio.Twilio | null = null;
  private twilioFromNumber: string | null = null;
  private blacksmsApiKey: string | null = null;
  private blacksmsSenderId: string | null = null;
  /** BlackSMS docs/examples send route as a string (e.g. "1"). */
  private blacksmsRoute: string = '1';
  private blacksmsSmsUrl: string = 'https://blacksms.in/sms';

  constructor() {
    const preferred = (process.env.SMS_PROVIDER || '').toLowerCase().trim();
    const blackKey = process.env.BLACKSMS_API_KEY?.trim() || null;
    const blackSender = process.env.BLACKSMS_SENDER_ID?.trim() || null;
    const twilioSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const twilioToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    this.twilioFromNumber = process.env.TWILIO_PHONE_NUMBER?.trim() || null;

    const routeRaw = process.env.BLACKSMS_ROUTE?.trim();
    if (routeRaw) this.blacksmsRoute = routeRaw;

    const smsUrl = process.env.BLACKSMS_SMS_URL?.trim();
    if (smsUrl) this.blacksmsSmsUrl = smsUrl;

    if (preferred === 'blacksms' || (!preferred && blackKey && blackSender)) {
      if (blackKey && blackSender) {
        this.provider = 'blacksms';
        this.blacksmsApiKey = blackKey;
        this.blacksmsSenderId = blackSender;
        this.logger.log('BlackSMS SMS service configured');
      } else {
        this.logger.warn(
          'SMS_PROVIDER=blacksms but BLACKSMS_API_KEY / BLACKSMS_SENDER_ID missing. OTP will not be sent.',
        );
      }
    } else if (preferred === 'twilio' || (!preferred && twilioSid && twilioToken)) {
      if (twilioSid && twilioToken && this.twilioFromNumber) {
        this.provider = 'twilio';
        this.twilioClient = twilio(twilioSid, twilioToken);
        this.logger.log('Twilio SMS service configured');
      } else {
        this.logger.warn(
          'Twilio not fully configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER). OTP will not be sent.',
        );
      }
    } else if (blackKey && blackSender) {
      this.provider = 'blacksms';
      this.blacksmsApiKey = blackKey;
      this.blacksmsSenderId = blackSender;
      this.logger.log('BlackSMS SMS service configured');
    } else if (twilioSid && twilioToken && this.twilioFromNumber) {
      this.provider = 'twilio';
      this.twilioClient = twilio(twilioSid, twilioToken);
      this.logger.log('Twilio SMS service configured');
    } else {
      this.logger.warn(
        'SMS not configured. Set BLACKSMS_API_KEY + BLACKSMS_SENDER_ID (or Twilio vars). OTP will not be sent.',
      );
    }
  }

  isConfigured(): boolean {
    return this.provider !== 'none';
  }

  /** Build BlackSMS JSON body (no network). Used for dry-run checks. */
  buildBlacksmsPayload(e164OrLocal: string, code: string): {
    sender_id: string;
    route: string;
    variables_values: string;
    numbers: string;
  } | null {
    const local = this.toIndiaLocalNumber(e164OrLocal);
    if (!local || !this.blacksmsSenderId) return null;
    if (!/^\d{4,8}$/.test(code)) return null;
    return {
      sender_id: this.blacksmsSenderId,
      route: this.blacksmsRoute,
      variables_values: code,
      numbers: local,
    };
  }

  async sendOtp(to: string, code: string): Promise<boolean> {
    const normalized = this.normalizePhone(to);
    if (!normalized) {
      return false;
    }

    if (this.provider === 'none') {
      this.logger.warn('SMS not configured; OTP would have been: ' + code);
      return false;
    }

    try {
      if (this.provider === 'blacksms') {
        await this.sendViaBlacksms(normalized, code);
      } else if (this.provider === 'twilio') {
        await this.sendViaTwilio(normalized, code);
      }
      this.logger.log(`OTP sent to ${normalized} via ${this.provider}`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to send OTP to ${normalized}: ${err}`);
      throw err;
    }
  }

  private async sendViaBlacksms(e164: string, code: string): Promise<void> {
    const payload = this.buildBlacksmsPayload(e164, code);
    if (!payload) {
      throw new Error('BlackSMS requires a valid Indian mobile number and sender_id');
    }

    const res = await fetch(this.blacksmsSmsUrl, {
      method: 'POST',
      headers: {
        Authorization: this.blacksmsApiKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const bodyText = await res.text();
    let body: BlackSmsResponse = {};
    try {
      body = bodyText ? (JSON.parse(bodyText) as BlackSmsResponse) : {};
    } catch {
      body = { message: bodyText };
    }

    const messageText = Array.isArray(body.message)
      ? body.message.join(', ')
      : body.message || `BlackSMS HTTP ${res.status}`;

    // Official success: { "return": true, "request_id": "...", "message": ["SMS sent successfully"] }
    const ok = res.ok && (body.return === true || body.status === 1);
    if (!ok) {
      throw new Error(messageText);
    }
  }

  private async sendViaTwilio(e164: string, code: string): Promise<void> {
    if (!this.twilioClient || !this.twilioFromNumber) {
      throw new Error('Twilio client not configured');
    }
    await this.twilioClient.messages.create({
      body: `Your OpsPick verification code is: ${code}. Valid for 10 minutes.`,
      from: this.twilioFromNumber,
      to: e164,
    });
  }

  /**
   * Normalize to E.164. Prefers full international digits from the client.
   * Bare 10-digit numbers default to India (+91) for this product rollout.
   */
  normalizePhone(phone: string): string | null {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) return null;
    if (digits.startsWith('0')) return null;
    if (digits.length === 10) return `+91${digits}`;
    return `+${digits}`;
  }

  /** BlackSMS expects a 10-digit Indian mobile number. */
  toIndiaLocalNumber(e164OrLocal: string): string | null {
    const digits = e164OrLocal.replace(/\D/g, '');
    if (digits.length === 10) return digits;
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    return null;
  }
}
