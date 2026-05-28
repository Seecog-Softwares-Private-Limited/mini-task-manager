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
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = require("nodemailer");
const email_template_util_1 = require("./email-template.util");
let EmailService = EmailService_1 = class EmailService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(EmailService_1.name);
        this.nodeEnv = this.configService.get('nodeEnv', { infer: true }) ?? 'development';
        this.initTransport();
    }
    async onModuleInit() {
        if (!this.smtp.verifyOnStartup) {
            this.logger.warn('SMTP_VERIFY_ON_STARTUP=false — skipping startup SMTP verification');
            return;
        }
        try {
            await this.transporter.verify();
            this.logger.log(`SMTP connection verified (${this.smtp.host}:${this.smtp.port})`);
        }
        catch (err) {
            const detail = this.formatError(err);
            this.logger.error(`SMTP verification failed (${this.smtp.host}:${this.smtp.port}): ${detail}. ` +
                'Emails will not deliver until SMTP is reachable. ' +
                'For local dev run MailHog (docker compose up -d mailhog) or configure SMTP_* in properties.env.');
        }
    }
    async sendInvitation(payload) {
        const { to, organizationName, inviterName, role, acceptUrl } = payload;
        await this.deliver({
            kind: 'invitation',
            to,
            subject: `You're invited to join ${organizationName}`,
            text: (0, email_template_util_1.emailPlainTextWithLink)(`${inviterName} has invited you to join ${organizationName} as ${role}.`, acceptUrl),
            html: (0, email_template_util_1.emailLayout)((0, email_template_util_1.emailInvitationBody)({
                inviterName,
                organizationName,
                role,
                acceptUrl,
            })),
        });
    }
    async sendTaskAssignment(payload) {
        const { to, assigneeName, taskTitle, projectName, assignerName, taskUrl } = payload;
        const projectLine = projectName ? ` in <strong>${projectName}</strong>` : '';
        await this.deliver({
            kind: 'task-assignment',
            to,
            subject: `Task assigned: ${taskTitle}`,
            text: `Hi ${assigneeName}, ${assignerName} has assigned you a task${projectName ? ` in ${projectName}` : ''}: "${taskTitle}". View it here: ${taskUrl}`,
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#1a1a2e;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="display:inline-block;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);line-height:48px;color:#fff;font-weight:700;font-size:20px;">M</div>
  </div>
  <h1 style="font-size:24px;font-weight:700;text-align:center;margin:0 0 8px;">Task Assigned to You</h1>
  <p style="text-align:center;color:#64748b;margin:0 0 32px;">
    Hi <strong>${assigneeName}</strong>, <strong>${assignerName}</strong> has assigned you a task${projectLine}.
  </p>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:0 0 32px;">
    <p style="font-size:18px;font-weight:600;margin:0 0 4px;">${taskTitle}</p>
    ${projectName ? `<p style="color:#94a3b8;font-size:13px;margin:0;">Project: ${projectName}</p>` : ''}
  </div>
  <div style="text-align:center;margin:32px 0;">
    <a href="${taskUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;">
      View Task
    </a>
  </div>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;" />
  <p style="text-align:center;color:#cbd5e1;font-size:12px;">Mini Task Manager</p>
</body>
</html>`.trim(),
        });
    }
    async sendVerificationEmail(payload) {
        const { to, fullName, verifyUrl, verifyPageUrl, shortCode } = payload;
        await this.deliver({
            kind: 'verification',
            to,
            subject: 'Verify your email - Mini Task Manager',
            text: (0, email_template_util_1.emailPlainTextWithLink)(`Hi ${fullName}, thanks for signing up! Verify your email by visiting:`, verifyUrl, shortCode),
            html: (0, email_template_util_1.emailLayout)((0, email_template_util_1.emailVerificationBody)({
                fullName,
                verifyUrl,
                verifyPageUrl,
                shortCode,
            })),
        });
    }
    async sendPasswordResetEmail(payload) {
        const { to, fullName, resetUrl } = payload;
        await this.deliver({
            kind: 'password-reset',
            to,
            subject: 'Reset your password - Mini Task Manager',
            text: (0, email_template_util_1.emailPlainTextWithLink)(`Hi ${fullName}, reset your password by visiting:`, resetUrl),
            html: (0, email_template_util_1.emailLayout)((0, email_template_util_1.emailPasswordResetBody)({ fullName, resetUrl })),
        });
    }
    initTransport() {
        this.smtp = this.configService.get('smtp', { infer: true });
        const { host, port, user, pass } = this.smtp;
        const isGmail = host.includes('gmail.com');
        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            ...(port === 587 ? { requireTLS: true } : {}),
            ...(user ? { auth: { user, pass } } : {}),
            ...(isGmail
                ? {
                    connectionTimeout: 10000,
                    greetingTimeout: 10000,
                    socketTimeout: 15000,
                }
                : {}),
            tls: {
                rejectUnauthorized: this.nodeEnv === 'production',
            },
        });
        const mode = host === 'localhost' && port === 1025
            ? ' (MailHog — view at http://localhost:8025)'
            : user
                ? ' (authenticated)'
                : ' (no SMTP auth — suitable for local MailHog)';
        this.logger.log(`Email transport configured: ${host}:${port}${mode}`);
    }
    formatFromAddress() {
        const fromRaw = this.smtp.from;
        return fromRaw.includes('<') ? fromRaw : `"Mini Task Manager" <${fromRaw}>`;
    }
    async deliver(params) {
        const { kind, to, subject, html, text } = params;
        const from = this.formatFromAddress();
        this.logger.log(`Sending ${kind} email to ${to} via ${this.smtp.host}:${this.smtp.port}`);
        try {
            const info = await this.transporter.sendMail({
                from,
                to,
                subject,
                html,
                text,
            });
            this.logger.log(`${kind} email sent to ${to} (messageId=${info.messageId ?? 'n/a'}, response=${info.response ?? 'n/a'})`);
        }
        catch (err) {
            const detail = this.formatError(err);
            this.logger.error(`Failed to send ${kind} email to ${to} via ${this.smtp.host}:${this.smtp.port}: ${detail}`, err instanceof Error ? err.stack : undefined);
            throw new common_1.ServiceUnavailableException(this.userFacingEmailError(detail));
        }
    }
    userFacingEmailError(detail) {
        const isGmail = this.smtp.host.includes('gmail.com');
        const badCredentials = /535|BadCredentials|Username and Password not accepted|Invalid login/i.test(detail);
        if (isGmail && badCredentials) {
            return ('Gmail rejected the SMTP credentials. Use a Google App Password (not your normal Gmail password): ' +
                'Google Account → Security → 2-Step Verification → App passwords. ' +
                'Set SMTP_USER to your Gmail address and SMTP_PASS to the 16-character app password in properties.env, then restart the API.');
        }
        if (this.smtp.host === 'localhost' && this.smtp.port === 1025) {
            return ('Could not send email. MailHog is not running. Start it with: docker compose up -d mailhog ' +
                'then open http://localhost:8025 to view captured mail.');
        }
        return (`Could not send email (${detail}). Check SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in properties.env and restart the API.`);
    }
    formatError(err) {
        if (err instanceof Error)
            return err.message;
        return String(err);
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map