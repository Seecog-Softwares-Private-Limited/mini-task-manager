const SES_HOST_PATTERN = /^email-smtp\.[a-z0-9-]+\.amazonaws\.com$/i;

/** True when the host is an Amazon SES SMTP endpoint (e.g. email-smtp.ap-south-1.amazonaws.com). */
export function isAmazonSesSmtpHost(host: string): boolean {
  return SES_HOST_PATTERN.test(host.trim());
}

/** True when Resend is the active email provider (API key or SMTP_PROVIDER=resend). */
export function isResendConfigured(): boolean {
  const provider = process.env.SMTP_PROVIDER?.trim().toLowerCase();
  if (provider === 'resend') return true;
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function resolveResendApiKey(): string {
  return process.env.RESEND_API_KEY?.trim() || process.env.SMTP_PASS?.trim() || '';
}

/**
 * Host used for logging / legacy SMTP only.
 * Resend uses the HTTP API (api.resend.com), not SMTP.
 *
 * Resolution order:
 * 1. Resend when RESEND_API_KEY / SMTP_PROVIDER=resend
 * 2. Explicit SMTP_HOST
 * 3. Legacy Amazon SES when AWS_SES_REGION is set
 * 4. localhost (MailHog)
 */
export function resolveSmtpHost(): string {
  if (isResendConfigured()) return 'api.resend.com';

  const explicit = process.env.SMTP_HOST?.trim();
  if (explicit) return explicit;

  const region = process.env.AWS_SES_REGION?.trim();
  if (region) return `email-smtp.${region}.amazonaws.com`;

  return 'localhost';
}

/** SMTP port: unused for Resend API; else explicit / SES 587 / MailHog 1025. */
export function resolveSmtpPort(host: string): number {
  if (isResendConfigured()) return 443;

  const explicit = process.env.SMTP_PORT?.trim();
  if (explicit) return parseInt(explicit, 10);
  if (isAmazonSesSmtpHost(host)) return 587;
  return 1025;
}

export type SmtpProvider = 'resend' | 'ses' | 'gmail' | 'mailhog' | 'generic';

export function resolveSmtpProvider(host: string, port: number): SmtpProvider {
  if (isResendConfigured()) return 'resend';
  if (isAmazonSesSmtpHost(host)) return 'ses';
  if (host.includes('gmail.com')) return 'gmail';
  if (host === 'localhost' && port === 1025) return 'mailhog';
  return 'generic';
}
