import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Configuration } from '../../config/configuration';
import {
  emailInvitationBody,
  emailLayout,
  emailPasswordResetBody,
  emailPlainTextInvite,
  emailPlainTextTaskAssignment,
  emailPlainTextWithLink,
  emailTaskAssignmentBody,
  emailVerificationBody,
  type TaskAssignmentAttachment,
  type TaskAssignmentSubtask,
} from './email-template.util';

export interface InviteEmailPayload {
  to: string;
  organizationName: string;
  inviterName: string;
  role: string;
  /** Button / primary link (may be API redirect when PUBLIC_API_URL is set). */
  acceptUrl: string;
  /** Direct app URL — always included as copy-paste fallback in the email. */
  directAppUrl: string;
}

export interface TaskAssignmentEmailPayload {
  to: string;
  assigneeName: string;
  assigneeEmail: string;
  assignerName: string;
  assignerEmail: string;
  taskTitle: string;
  taskDescription?: string | null;
  projectName?: string;
  dueDateLabel: string;
  subtasks: TaskAssignmentSubtask[];
  attachments: TaskAssignmentAttachment[];
  allAssigneesLabel: string;
  taskUrl: string;
  emailSubject?: string;
  headline?: string;
  introHtml?: string;
  cardLabel?: string;
  highlightTitle?: string;
  parentTaskTitle?: string;
  focusSubtasks?: TaskAssignmentSubtask[];
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
  private fallbackTransporter?: nodemailer.Transporter;
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
    const { to, organizationName, inviterName, role, acceptUrl, directAppUrl } = payload;

    await this.deliver({
      kind: 'invitation',
      to,
      subject: `You're invited to join ${organizationName}`,
      text: emailPlainTextInvite(
        inviterName,
        organizationName,
        role,
        acceptUrl,
        directAppUrl,
      ),
      html: emailLayout(
        emailInvitationBody({
          inviterName,
          organizationName,
          role,
          acceptUrl,
          directAppUrl,
        }),
      ),
    });
  }

  async sendTaskAssignment(payload: TaskAssignmentEmailPayload): Promise<void> {
    const {
      to,
      assigneeName,
      assigneeEmail,
      assignerName,
      assignerEmail,
      taskTitle,
      taskDescription,
      projectName,
      dueDateLabel,
      subtasks,
      attachments,
      allAssigneesLabel,
      taskUrl,
    } = payload;

    const templateParams = {
      assigneeName,
      assigneeEmail,
      assignerName,
      assignerEmail,
      taskTitle,
      taskDescription,
      projectName,
      dueDateLabel,
      subtasks,
      attachments,
      allAssigneesLabel,
      taskUrl,
      emailSubject: payload.emailSubject,
      headline: payload.headline,
      introHtml: payload.introHtml,
      cardLabel: payload.cardLabel,
      highlightTitle: payload.highlightTitle,
      parentTaskTitle: payload.parentTaskTitle,
      focusSubtasks: payload.focusSubtasks,
    };

    await this.deliver({
      kind: 'task-assignment',
      to,
      subject: payload.emailSubject ?? `Task assigned: ${taskTitle}`,
      text: emailPlainTextTaskAssignment(templateParams),
      html: emailLayout(emailTaskAssignmentBody(templateParams)),
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
      html: emailLayout(
        emailVerificationBody({
          fullName,
          verifyUrl,
          verifyPageUrl,
          shortCode,
        }),
      ),
    });
  }

  async sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<void> {
    const { to, fullName, resetUrl } = payload;

    await this.deliver({
      kind: 'password-reset',
      to,
      subject: 'Reset your password - Mini Task Manager',
      text: emailPlainTextWithLink(`Hi ${fullName}, reset your password by visiting:`, resetUrl),
      html: emailLayout(emailPasswordResetBody({ fullName, resetUrl })),
    });
  }

  private initTransport(): void {
    this.smtp = this.configService.get('smtp', { infer: true })!;
    const { host, port, user, pass, provider } = this.smtp;

    this.transporter = this.createTransport(
      { host, port, user, pass },
      provider,
    );

    const mode =
      provider === 'mailhog'
        ? ' (MailHog — view at http://localhost:8025)'
        : provider === 'ses'
          ? ` (Amazon SES${this.smtp.region ? `, ${this.smtp.region}` : ''})`
          : user
            ? ' (authenticated)'
            : ' (no SMTP auth — suitable for local MailHog)';
    this.logger.log(`Email transport configured: ${host}:${port}${mode}`);

    const fallback = this.smtp.fallback;
    if (fallback?.host) {
      this.fallbackTransporter = this.createTransport(fallback, 'gmail');
      this.logger.log(
        `SMTP fallback configured: ${fallback.host}:${fallback.port} (used when primary send fails)`,
      );
    }
  }

  private createTransport(
    smtp: { host: string; port: number; user?: string; pass?: string },
    providerHint?: string,
  ): nodemailer.Transporter {
    const isGmail = providerHint === 'gmail' || smtp.host.includes('gmail.com');
    const isSes = smtp.host.includes('amazonaws.com');

    return nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      ...(smtp.port === 587 ? { requireTLS: true } : {}),
      ...(smtp.user ? { auth: { user: smtp.user, pass: smtp.pass } } : {}),
      ...(isGmail || isSes
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
    const replyTo = this.resolveReplyTo();
    const mail = {
      from,
      to,
      subject,
      html,
      text,
      ...(replyTo ? { replyTo } : {}),
      headers: {
        'X-Mailer': 'Mini Task Manager',
        'X-Priority': '3',
      },
    };

    this.logger.log(`Sending ${kind} email to ${to} via ${this.smtp.host}:${this.smtp.port}`);

    try {
      const info = await this.transporter.sendMail(mail);
      this.logger.log(
        `${kind} email sent to ${to} (messageId=${info.messageId ?? 'n/a'}, response=${info.response ?? 'n/a'})`,
      );
      return;
    } catch (err) {
      const detail = this.formatError(err);
      this.logger.error(
        `Failed to send ${kind} email to ${to} via ${this.smtp.host}:${this.smtp.port}: ${detail}`,
        err instanceof Error ? err.stack : undefined,
      );

      if (this.fallbackTransporter && this.smtp.fallback) {
        const fallbackFrom = this.smtp.fallback.from.includes('<')
          ? this.smtp.fallback.from
          : `"Mini Task Manager" <${this.smtp.fallback.from}>`;
        this.logger.warn(
          `Retrying ${kind} email to ${to} via fallback SMTP ${this.smtp.fallback.host}:${this.smtp.fallback.port}`,
        );
        try {
          const info = await this.fallbackTransporter.sendMail({
            ...mail,
            from: fallbackFrom,
            ...(this.smtp.fallback.user?.includes('@')
              ? { replyTo: this.smtp.fallback.user }
              : {}),
          });
          this.logger.log(
            `${kind} email sent to ${to} via fallback (messageId=${info.messageId ?? 'n/a'}, response=${info.response ?? 'n/a'})`,
          );
          return;
        } catch (fallbackErr) {
          const fallbackDetail = this.formatError(fallbackErr);
          this.logger.error(
            `Fallback SMTP also failed for ${to}: ${fallbackDetail}`,
            fallbackErr instanceof Error ? fallbackErr.stack : undefined,
          );
        }
      }

      throw new ServiceUnavailableException(this.userFacingEmailError(detail));
    }
  }

  private resolveReplyTo(): string | undefined {
    const user = this.smtp.user?.trim();
    if (user?.includes('@')) return user;

    const from = this.smtp.from.trim();
    const bracketMatch = from.match(/<([^>]+)>/);
    if (bracketMatch?.[1]?.includes('@')) return bracketMatch[1];

    if (from.includes('@')) return from.replace(/^["']|["']$/g, '');
    return undefined;
  }

  private userFacingEmailError(detail: string): string {
    const { provider } = this.smtp;
    const badCredentials =
      /535|BadCredentials|Username and Password not accepted|Invalid login|Authentication Credentials Invalid/i.test(
        detail,
      );

    if (provider === 'gmail' && badCredentials) {
      return (
        'Gmail rejected the SMTP credentials. Use a Google App Password (not your normal Gmail password): ' +
        'Google Account → Security → 2-Step Verification → App passwords. ' +
        'Set SMTP_USER to your Gmail address and SMTP_PASS to the 16-character app password in properties.env, then restart the API.'
      );
    }

    if (provider === 'ses' && badCredentials) {
      return (
        'Amazon SES rejected the SMTP credentials. In AWS Console → SES → SMTP settings, create SMTP credentials ' +
        '(not IAM access keys). Set SMTP_USER and SMTP_PASS in properties.env, then restart the API.'
      );
    }

    if (
      provider === 'ses' &&
      /not verified|Email address is not verified|sandbox|554|553 Mail from|Message rejected/i.test(detail)
    ) {
      return (
        'Amazon SES rejected the message. If your account is in the SES sandbox, you can only send to ' +
        'verified recipient addresses — verify the recipient in SES (Verified identities) or request production access. ' +
        'Also ensure SMTP_FROM matches your verified sender identity.'
      );
    }

    if (provider === 'mailhog') {
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
