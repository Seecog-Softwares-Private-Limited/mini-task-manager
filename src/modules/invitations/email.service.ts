import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface InviteEmailPayload {
  to: string;
  organizationName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
}

export interface TaskAssignmentEmailPayload {
  to: string;
  assigneeName: string;
  taskTitle: string;
  projectName?: string;
  assignerName: string;
  taskUrl: string;
}

export interface VerificationEmailPayload {
  to: string;
  fullName: string;
  verifyUrl: string;
}

export interface PasswordResetEmailPayload {
  to: string;
  fullName: string;
  resetUrl: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const host = process.env.SMTP_HOST || 'localhost';
    const port = parseInt(process.env.SMTP_PORT || '1025', 10);
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';

    const isGmail = host.includes('gmail.com');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      ...(port === 587 ? { requireTLS: true } : {}),
      ...(user ? { auth: { user, pass } } : {}),
      // Gmail-specific: increase timeouts for reliability
      ...(isGmail ? {
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      } : {}),
      tls: {
        // Don't fail on self-signed certs in dev
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });

    const mode = host === 'localhost' && port === 1025
      ? ' (MailHog — emails captured locally, not sent to inbox)'
      : '';
    this.logger.log(`Email transport configured: ${host}:${port}${mode}`);
  }

  async sendInvitation(payload: InviteEmailPayload): Promise<void> {
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
    } catch (err) {
      this.logger.error(`Failed to send invite email to ${to}: ${err}`);
    }
  }

  async sendTaskAssignment(payload: TaskAssignmentEmailPayload): Promise<void> {
    const { to, assigneeName, taskTitle, projectName, assignerName, taskUrl } = payload;
    const fromRaw = process.env.SMTP_FROM || 'noreply@minitaskmanager.local';
    const from = fromRaw.includes('<') ? fromRaw : `"Mini Task Manager" <${fromRaw}>`;

    const projectLine = projectName ? ` in <strong>${projectName}</strong>` : '';

    const html = `
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
</html>`.trim();

    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject: `Task assigned: ${taskTitle}`,
        html,
        text: `Hi ${assigneeName}, ${assignerName} has assigned you a task${projectName ? ` in ${projectName}` : ''}: "${taskTitle}". View it here: ${taskUrl}`,
      });
      this.logger.log(`Task assignment email sent to ${to} (messageId=${info.messageId})`);
    } catch (err) {
      this.logger.error(`Failed to send task assignment email to ${to}: ${err}`);
    }
  }

  async sendVerificationEmail(payload: VerificationEmailPayload): Promise<void> {
    const { to, fullName, verifyUrl } = payload;
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
  <h1 style="font-size:24px;font-weight:700;text-align:center;margin:0 0 8px;">Verify your email</h1>
  <p style="text-align:center;color:#64748b;margin:0 0 32px;">
    Hi <strong>${fullName}</strong>, thanks for signing up! Click the button below to verify your email and get started.
  </p>
  <div style="text-align:center;margin:32px 0;">
    <a href="${verifyUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;">
      Verify Email
    </a>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:13px;margin-top:32px;">
    This link expires in 24 hours. If you didn&apos;t create an account, you can safely ignore this email.
  </p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;" />
  <p style="text-align:center;color:#cbd5e1;font-size:12px;">Mini Task Manager</p>
</body>
</html>`.trim();

    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject: 'Verify your email - Mini Task Manager',
        html,
        text: `Hi ${fullName}, verify your email by visiting: ${verifyUrl}`,
      });
      this.logger.log(`Verification email sent to ${to} (messageId=${info.messageId})`);
    } catch (err) {
      this.logger.error(`Failed to send verification email to ${to}: ${err}`);
      throw err;
    }
  }

  async sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<void> {
    const { to, fullName, resetUrl } = payload;
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
  <h1 style="font-size:24px;font-weight:700;text-align:center;margin:0 0 8px;">Reset your password</h1>
  <p style="text-align:center;color:#64748b;margin:0 0 32px;">
    Hi <strong>${fullName}</strong>, we received a request to reset your password. Click the button below to set a new password.
  </p>
  <div style="text-align:center;margin:32px 0;">
    <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;">
      Reset Password
    </a>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:13px;margin-top:32px;">
    This link expires in 1 hour. If you didn&apos;t request a password reset, you can safely ignore this email.
  </p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;" />
  <p style="text-align:center;color:#cbd5e1;font-size:12px;">Mini Task Manager</p>
</body>
</html>`.trim();

    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject: 'Reset your password - Mini Task Manager',
        html,
        text: `Hi ${fullName}, reset your password by visiting: ${resetUrl}`,
      });
      this.logger.log(`Password reset email sent to ${to} (messageId=${info.messageId})`);
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${to}: ${err}`);
      throw err;
    }
  }
}
