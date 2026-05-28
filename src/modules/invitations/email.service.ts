import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Configuration } from '../../config/configuration';
import {
  emailActionSection,
  emailLayout,
  emailPlainTextWithLink,
  emailVerificationActions,
  emailVerificationCodeBlock,
  escapeHtml,
} from './email-template.util';

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
  verifyPageUrl: string;
  shortCode: string;
}

export interface PasswordResetEmailPayload {
  to: string;
  fullName: string;
  resetUrl: string;
}

type SmtpConfig = Configuration['smtp'];

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter!: nodemailer.Transporter;
  private smtp!: SmtpConfig;
  private readonly nodeEnv: string;

  constructor(private readonly configService: ConfigService<Configuration>) {
    this.nodeEnv = this.configService.get('nodeEnv', { infer: true }) ?? 'development';
    this.initTransport();
  }

  async onModuleInit(): Promise<void> {
    if (!this.smtp.verifyOnStartup) {
      this.logger.warn('SMTP_VERIFY_ON_STARTUP=false — skipping startup SMTP verification');
      return;
    }

    try {
      await this.transporter.verify();
      this.logger.log(`SMTP connection verified (${this.smtp.host}:${this.smtp.port})`);
    } catch (err) {
      const detail = this.formatError(err);
      this.logger.error(
        `SMTP verification failed (${this.smtp.host}:${this.smtp.port}): ${detail}. ` +
          'Emails will not deliver until SMTP is reachable. ' +
          'For local dev run MailHog (docker compose up -d mailhog) or configure SMTP_* in properties.env.',
      );
    }
  }

  async sendInvitation(payload: InviteEmailPayload): Promise<void> {
    const { to, organizationName, inviterName, role, acceptUrl } = payload;

    await this.deliver({
      kind: 'invitation',
      to,
      subject: `You're invited to join ${organizationName}`,
      text: emailPlainTextWithLink(
        `${inviterName} has invited you to join ${organizationName} as ${role}.`,
        acceptUrl,
      ),
      html: emailLayout(`
  <h1 style="font-size:24px;font-weight:700;text-align:center;margin:0 0 8px;">You're invited!</h1>
  <p style="text-align:center;color:#64748b;margin:0 0 32px;">
    <strong>${escapeHtml(inviterName)}</strong> has invited you to join <strong>${escapeHtml(organizationName)}</strong> as <strong>${escapeHtml(role)}</strong>.
  </p>
  ${emailActionSection(acceptUrl, 'Accept Invitation')}
  <p style="text-align:center;color:#94a3b8;font-size:13px;margin-top:32px;">
    This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
  </p>`),
    });
  }

  async sendTaskAssignment(payload: TaskAssignmentEmailPayload): Promise<void> {
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

  async sendVerificationEmail(payload: VerificationEmailPayload): Promise<void> {
    const { to, fullName, verifyUrl, verifyPageUrl, shortCode } = payload;

    await this.deliver({
      kind: 'verification',
      to,
      subject: 'Verify your email - Mini Task Manager',
      text: emailPlainTextWithLink(
        `Hi ${fullName}, thanks for signing up! Verify your email by visiting:`,
        verifyUrl,
        shortCode,
      ),
      html: emailLayout(`
  <h1 style="font-size:24px;font-weight:700;text-align:center;margin:0 0 8px;">Verify your email</h1>
  <p style="text-align:center;color:#64748b;margin:0 0 24px;">
    Hi <strong>${escapeHtml(fullName)}</strong>, thanks for signing up!
  </p>
  ${emailVerificationCodeBlock(shortCode, verifyPageUrl)}
  ${emailVerificationActions(verifyUrl)}
  <p style="text-align:center;color:#94a3b8;font-size:13px;margin-top:32px;">
    This code expires in 24 hours. If you didn&apos;t create an account, you can safely ignore this email.
  </p>`),
    });
  }

  async sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<void> {
    const { to, fullName, resetUrl } = payload;

    await this.deliver({
      kind: 'password-reset',
      to,
      subject: 'Reset your password - Mini Task Manager',
      text: emailPlainTextWithLink(`Hi ${fullName}, reset your password by visiting:`, resetUrl),
      html: emailLayout(`
  <h1 style="font-size:24px;font-weight:700;text-align:center;margin:0 0 8px;">Reset your password</h1>
  <p style="text-align:center;color:#64748b;margin:0 0 32px;">
    Hi <strong>${escapeHtml(fullName)}</strong>, we received a request to reset your password. Click the button below to set a new password.
  </p>
  ${emailActionSection(resetUrl, 'Reset Password')}
  <p style="text-align:center;color:#94a3b8;font-size:13px;margin-top:32px;">
    This link expires in 1 hour. If you didn&apos;t request a password reset, you can safely ignore this email.
  </p>`),
    });
  }

  private initTransport(): void {
    this.smtp = this.configService.get('smtp', { infer: true })!;
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

    const mode =
      host === 'localhost' && port === 1025
        ? ' (MailHog — view at http://localhost:8025)'
        : user
          ? ' (authenticated)'
          : ' (no SMTP auth — suitable for local MailHog)';
    this.logger.log(`Email transport configured: ${host}:${port}${mode}`);
  }

  private formatFromAddress(): string {
    const fromRaw = this.smtp.from;
    return fromRaw.includes('<') ? fromRaw : `"Mini Task Manager" <${fromRaw}>`;
  }

  private async deliver(params: {
    kind: string;
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
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
      this.logger.log(
        `${kind} email sent to ${to} (messageId=${info.messageId ?? 'n/a'}, response=${info.response ?? 'n/a'})`,
      );
    } catch (err) {
      const detail = this.formatError(err);
      this.logger.error(
        `Failed to send ${kind} email to ${to} via ${this.smtp.host}:${this.smtp.port}: ${detail}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new ServiceUnavailableException(this.userFacingEmailError(detail));
    }
  }

  private userFacingEmailError(detail: string): string {
    const isGmail = this.smtp.host.includes('gmail.com');
    const badCredentials =
      /535|BadCredentials|Username and Password not accepted|Invalid login/i.test(detail);

    if (isGmail && badCredentials) {
      return (
        'Gmail rejected the SMTP credentials. Use a Google App Password (not your normal Gmail password): ' +
        'Google Account → Security → 2-Step Verification → App passwords. ' +
        'Set SMTP_USER to your Gmail address and SMTP_PASS to the 16-character app password in properties.env, then restart the API.'
      );
    }

    if (this.smtp.host === 'localhost' && this.smtp.port === 1025) {
      return (
        'Could not send email. MailHog is not running. Start it with: docker compose up -d mailhog ' +
        'then open http://localhost:8025 to view captured mail.'
      );
    }

    return (
      `Could not send email (${detail}). Check SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in properties.env and restart the API.`
    );
  }

  private formatError(err: unknown): string {
    if (err instanceof Error) return err.message;
    return String(err);
  }
}
