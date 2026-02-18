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
const nodemailer = require("nodemailer");
let EmailService = EmailService_1 = class EmailService {
    constructor() {
        this.logger = new common_1.Logger(EmailService_1.name);
        const host = process.env.SMTP_HOST || 'localhost';
        const port = parseInt(process.env.SMTP_PORT || '1025', 10);
        const user = process.env.SMTP_USER || '';
        const pass = process.env.SMTP_PASS || '';
        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            requireTLS: port === 587,
            ...(user ? { auth: { user, pass } } : {}),
        });
        const mode = host === 'localhost' && port === 1025
            ? ' (MailHog — emails captured locally, not sent to inbox)'
            : '';
        this.logger.log(`Email transport configured: ${host}:${port}${mode}`);
    }
    async sendInvitation(payload) {
        const { to, organizationName, inviterName, role, acceptUrl } = payload;
        const fromRaw = process.env.SMTP_FROM || 'noreply@minitaskmanager.local';
        const from = fromRaw.includes('<') ? fromRaw : `"Mini Task Manager" <${fromRaw}>`;
        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#1a1a2e;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="display:inline-block;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);line-height:48px;color:#fff;font-weight:700;font-size:20px;">M</div>
  </div>
  <h1 style="font-size:24px;font-weight:700;text-align:center;margin:0 0 8px;">You're invited!</h1>
  <p style="text-align:center;color:#64748b;margin:0 0 32px;">
    <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> as <strong>${role}</strong>.
  </p>
  <div style="text-align:center;margin:32px 0;">
    <a href="${acceptUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;">
      Accept Invitation
    </a>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:13px;margin-top:32px;">
    This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
  </p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;" />
  <p style="text-align:center;color:#cbd5e1;font-size:12px;">Mini Task Manager</p>
</body>
</html>`.trim();
        try {
            const info = await this.transporter.sendMail({
                from,
                to,
                subject: `You're invited to join ${organizationName}`,
                html,
                text: `${inviterName} has invited you to join ${organizationName} as ${role}. Accept here: ${acceptUrl}`,
            });
            this.logger.log(`Invite email sent to ${to} (messageId=${info.messageId})`);
        }
        catch (err) {
            this.logger.error(`Failed to send invite email to ${to}: ${err}`);
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EmailService);
//# sourceMappingURL=email.service.js.map