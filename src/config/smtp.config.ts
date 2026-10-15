const SES_HOST_PATTERN = /^email-smtp\.[a-z0-9-]+\.amazonaws\.com$/i;

/** True when the host is an Amazon SES SMTP endpoint (e.g. email-smtp.ap-south-1.amazonaws.com). */
export function isAmazonSesSmtpHost(host: string): boolean {
  return SES_HOST_PATTERN.test(host.trim());
}

/**
 * SMTP host resolution:
 * 1. Explicit SMTP_HOST
 * 2. Amazon SES when AWS_SES_REGION is set
 * 3. localhost (MailHog)
 */
export function resolveSmtpHost(): string {
  const explicit = process.env.SMTP_HOST?.trim();
  if (explicit) return explicit;

  const region = process.env.AWS_SES_REGION?.trim();
  if (region) return `email-smtp.${region}.amazonaws.com`;

  return 'localhost';
}

/** SMTP port: explicit / SES 587 / MailHog 1025. */
export function resolveSmtpPort(host: string): number {
  const explicit = process.env.SMTP_PORT?.trim();
  if (explicit) return parseInt(explicit, 10);
  if (isAmazonSesSmtpHost(host)) return 587;
  return 1025;
}

export type SmtpProvider = 'ses' | 'gmail' | 'mailhog' | 'generic';

export function resolveSmtpProvider(host: string, port: number): SmtpProvider {
  const forced = process.env.SMTP_PROVIDER?.trim().toLowerCase();
  if (forced === 'ses' || forced === 'gmail' || forced === 'mailhog' || forced === 'generic') {
    return forced;
  }
  if (isAmazonSesSmtpHost(host)) return 'ses';
  if (host.includes('gmail.com')) return 'gmail';
  if (host === 'localhost' && port === 1025) return 'mailhog';
  return 'generic';
}
