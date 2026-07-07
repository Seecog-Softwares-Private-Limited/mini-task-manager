const SES_HOST_PATTERN = /^email-smtp\.[a-z0-9-]+\.amazonaws\.com$/i;

/** True when the host is an Amazon SES SMTP endpoint (e.g. email-smtp.ap-south-1.amazonaws.com). */
export function isAmazonSesSmtpHost(host: string): boolean {
  return SES_HOST_PATTERN.test(host.trim());
}

/**
 * SMTP host: explicit SMTP_HOST, else email-smtp.{AWS_SES_REGION}.amazonaws.com, else localhost (MailHog).
 */
export function resolveSmtpHost(): string {
  const explicit = process.env.SMTP_HOST?.trim();
  if (explicit) return explicit;

  const region = process.env.AWS_SES_REGION?.trim();
  if (region) return `email-smtp.${region}.amazonaws.com`;

  return 'localhost';
}

/** SMTP port: explicit SMTP_PORT, else 587 for SES, else 1025 (MailHog). */
export function resolveSmtpPort(host: string): number {
  const explicit = process.env.SMTP_PORT?.trim();
  if (explicit) return parseInt(explicit, 10);
  if (isAmazonSesSmtpHost(host)) return 587;
  return 1025;
}

export type SmtpProvider = 'ses' | 'gmail' | 'mailhog' | 'generic';

export function resolveSmtpProvider(host: string, port: number): SmtpProvider {
  if (isAmazonSesSmtpHost(host)) return 'ses';
  if (host.includes('gmail.com')) return 'gmail';
  if (host === 'localhost' && port === 1025) return 'mailhog';
  return 'generic';
}
