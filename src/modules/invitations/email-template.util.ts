/** Brand palette — matches frontend auth/dashboard theme (violet + emerald on slate). */
const BRAND = {
  bg: '#F6F8FC',
  card: '#ffffff',
  cardBorder: '#e2e8f0',
  footerBg: '#f8fafc',
  text: '#0f172a',
  textMuted: '#64748b',
  textLight: '#94a3b8',
  violet: '#7c3aed',
  violetDark: '#6d28d9',
  violetSoft: '#f5f3ff',
  violetBorder: '#ddd6fe',
  emerald: '#10b981',
  emeraldDark: '#059669',
  emeraldSoft: '#ecfdf5',
  emeraldBorder: '#6ee7b7',
} as const;

/** Escape text for safe inclusion in HTML email bodies. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** True when the URL points at local dev — Gmail disables these links in real inboxes. */
export function isLocalhostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(url);
  }
}

function emailLogo(): string {
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 8px;">
  <tr>
    <td align="center" width="56" height="56" bgcolor="${BRAND.violet}"
        style="width:56px;height:56px;border-radius:16px;background-color:${BRAND.violet};">
      <span style="font-size:22px;font-weight:700;color:#ffffff;line-height:56px;">M</span>
    </td>
  </tr>
</table>
<p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.14em;color:${BRAND.textLight};">
  Mini Task Manager
</p>`.trim();
}

function emailPrimaryButton(actionUrl: string, label: string): string {
  const href = escapeHtml(actionUrl);
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:28px auto;">
  <tr>
    <td align="center" bgcolor="${BRAND.emeraldDark}"
        style="border-radius:12px;background-color:${BRAND.emeraldDark};box-shadow:0 8px 20px -8px rgba(16,185,129,0.55);">
      <a href="${href}" target="_blank" rel="noopener noreferrer"
         style="display:inline-block;padding:14px 36px;font-size:16px;font-weight:600;line-height:1.2;color:#ffffff !important;text-decoration:none;border-radius:12px;background-color:${BRAND.emeraldDark};">
        ${escapeHtml(label)} &rarr;
      </a>
    </td>
  </tr>
</table>`.trim();
}

/** Copy-paste link block for localhost (Gmail blocks localhost hrefs). */
export function emailLocalLinkBlock(actionUrl: string, actionLabel: string): string {
  const url = escapeHtml(actionUrl);
  return `
<div style="margin:28px 0;padding:24px;background:${BRAND.violetSoft};border:1px solid ${BRAND.violetBorder};border-radius:16px;text-align:center;">
  <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:${BRAND.violetDark};text-transform:uppercase;letter-spacing:0.1em;">
    ${escapeHtml(actionLabel)}
  </p>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${BRAND.violetDark};">
    Gmail cannot open <strong>localhost</strong> links from email. Copy the link below and paste it into your browser:
  </p>
  <p style="margin:0;padding:14px 16px;background:${BRAND.card};border:1px solid ${BRAND.violetBorder};border-radius:10px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12px;color:${BRAND.violet};word-break:break-all;line-height:1.6;text-align:left;">
    ${url}
  </p>
</div>`.trim();
}

/** Plain URL fallback for production emails. */
export function emailLinkFallback(actionUrl: string): string {
  if (isLocalhostUrl(actionUrl)) return '';

  const href = escapeHtml(actionUrl);
  return `
<p style="text-align:center;color:${BRAND.textMuted};font-size:13px;line-height:1.5;margin:20px 0 10px;">
  If the button above does not work, copy and paste this link into your browser:
</p>
<p style="text-align:center;margin:0;word-break:break-all;">
  <a href="${href}" target="_blank" rel="noopener noreferrer"
     style="color:${BRAND.violet};font-size:13px;text-decoration:underline;">
    ${href}
  </a>
</p>`.trim();
}

/** CTA button (production) or copy-paste block (localhost). */
export function emailActionSection(actionUrl: string, label: string): string {
  if (isLocalhostUrl(actionUrl)) {
    return emailLocalLinkBlock(actionUrl, label);
  }
  return `${emailPrimaryButton(actionUrl, label)}\n${emailLinkFallback(actionUrl)}`;
}

export function emailPlainTextWithLink(intro: string, actionUrl: string, shortCode?: string): string {
  const verifyPage = actionUrl.replace(/\?token=.*$/, '');
  if (shortCode && isLocalhostUrl(actionUrl)) {
    return `${intro}

Your verification code: ${shortCode}

1. Open this page in your browser: ${verifyPage}
2. Enter the 6-digit code above
3. Click "Verify email"

(Gmail cannot open localhost links from email — use the code instead.)`;
  }
  if (isLocalhostUrl(actionUrl)) {
    return `${intro}

Open this link in your browser (Gmail blocks localhost links in email):
${actionUrl}`;
  }
  const codeLine = shortCode ? `\n\nYour verification code: ${shortCode}\n` : '';
  return `${intro}
${codeLine}
${actionUrl}

If the link is not clickable, copy and paste the URL above into your browser.`;
}

function emailExpiryNote(duration: string): string {
  return `
<p style="text-align:center;color:${BRAND.textLight};font-size:13px;line-height:1.5;margin:28px 0 0;">
  This link expires in ${duration}. If you didn&apos;t expect this email, you can safely ignore it.
</p>`.trim();
}

/** Workspace invitation body — themed card + accept CTA. */
export function emailInvitationBody(params: {
  inviterName: string;
  organizationName: string;
  role: string;
  acceptUrl: string;
}): string {
  const { inviterName, organizationName, role, acceptUrl } = params;
  const roleLabel = escapeHtml(role.charAt(0).toUpperCase() + role.slice(1).toLowerCase());

  return `
<h1 style="font-size:26px;font-weight:700;text-align:center;margin:0 0 8px;color:${BRAND.text};letter-spacing:-0.02em;">
  You&apos;re invited!
</h1>
<p style="text-align:center;color:${BRAND.textMuted};font-size:15px;line-height:1.6;margin:0 0 28px;">
  Join your team and start collaborating on Mini Task Manager
</p>
<div style="background:${BRAND.footerBg};border:1px solid ${BRAND.cardBorder};border-radius:16px;padding:24px;margin:0 0 8px;text-align:center;">
  <p style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:${BRAND.textLight};">
    Workspace
  </p>
  <p style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.text};letter-spacing:-0.01em;">
    ${escapeHtml(organizationName)}
  </p>
  <p style="margin:0;font-size:14px;line-height:1.6;color:${BRAND.textMuted};">
    <strong style="color:${BRAND.violet};">${escapeHtml(inviterName)}</strong>
    invited you to join as
  </p>
  <p style="margin:12px 0 0;">
    <span style="display:inline-block;padding:6px 16px;background:#ede9fe;color:${BRAND.violetDark};border-radius:999px;font-size:13px;font-weight:600;">
      ${roleLabel}
    </span>
  </p>
</div>
${emailActionSection(acceptUrl, 'Accept Invitation')}
${emailExpiryNote('7 days')}`.trim();
}

/** Verify-email body intro + code block + CTA. */
export function emailVerificationBody(params: {
  fullName: string;
  verifyUrl: string;
  verifyPageUrl: string;
  shortCode: string;
}): string {
  const { fullName, verifyUrl, verifyPageUrl, shortCode } = params;

  return `
<h1 style="font-size:26px;font-weight:700;text-align:center;margin:0 0 8px;color:${BRAND.text};letter-spacing:-0.02em;">
  Verify your email
</h1>
<p style="text-align:center;color:${BRAND.textMuted};font-size:15px;line-height:1.6;margin:0 0 24px;">
  Hi <strong style="color:${BRAND.text};">${escapeHtml(fullName)}</strong>, thanks for signing up!
</p>
${emailVerificationCodeBlock(shortCode, verifyPageUrl)}
${emailVerificationActions(verifyUrl)}
${emailExpiryNote('24 hours')}`.trim();
}

/** Password reset body. */
export function emailPasswordResetBody(params: { fullName: string; resetUrl: string }): string {
  const { fullName, resetUrl } = params;

  return `
<h1 style="font-size:26px;font-weight:700;text-align:center;margin:0 0 8px;color:${BRAND.text};letter-spacing:-0.02em;">
  Reset your password
</h1>
<p style="text-align:center;color:${BRAND.textMuted};font-size:15px;line-height:1.6;margin:0 0 28px;">
  Hi <strong style="color:${BRAND.text};">${escapeHtml(fullName)}</strong>, we received a request to reset your password.
</p>
${emailActionSection(resetUrl, 'Reset Password')}
${emailExpiryNote('1 hour')}`.trim();
}

/** 6-digit code block — always readable in Gmail (no links required). */
export function emailVerificationCodeBlock(shortCode: string, verifyPageUrl: string): string {
  const page = escapeHtml(verifyPageUrl);
  const code = escapeHtml(shortCode);
  const isLocal = isLocalhostUrl(verifyPageUrl);

  const instructions = isLocal
    ? `<p style="margin:0;font-size:14px;line-height:1.6;color:#166534;">
    Gmail cannot open localhost links from email. Follow these steps:
  </p>
  <ol style="margin:16px 0 0;padding-left:20px;text-align:left;color:#166534;font-size:14px;line-height:1.7;">
    <li>Copy the code above: <strong style="font-family:ui-monospace,monospace;letter-spacing:0.15em;">${code}</strong></li>
    <li>Open this page in your browser:<br />
      <span style="display:inline-block;margin-top:6px;padding:8px 12px;background:#fff;border:1px solid ${BRAND.emeraldBorder};border-radius:8px;font-family:ui-monospace,monospace;font-size:13px;color:#15803d;word-break:break-all;">${page}</span>
    </li>
    <li>Paste the code and click <strong>Verify email</strong></li>
  </ol>`
    : `<p style="margin:0;font-size:14px;line-height:1.5;color:#166534;">
    Or enter this code at <strong>${page}</strong> if the button below does not work.
  </p>`;

  return `
<div style="margin:8px 0 28px;padding:24px;background:${BRAND.emeraldSoft};border:1px solid ${BRAND.emeraldBorder};border-radius:16px;text-align:center;">
  <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.1em;">
    Your verification code
  </p>
  <p style="margin:0 0 16px;font-size:36px;font-weight:700;letter-spacing:0.25em;color:#15803d;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">
    ${code}
  </p>
  ${instructions}
</div>`.trim();
}

/** Verify-email CTA. */
export function emailVerificationActions(verifyUrl: string): string {
  return emailActionSection(verifyUrl, 'Verify Email');
}

export function emailLayout(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Mini Task Manager</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
               style="max-width:560px;background-color:${BRAND.card};border-radius:20px;border:1px solid ${BRAND.cardBorder};overflow:hidden;">
          <tr>
            <td height="4" bgcolor="${BRAND.violet}"
                style="height:4px;background:linear-gradient(90deg,#8b5cf6,${BRAND.violet},${BRAND.emerald});font-size:0;line-height:0;">
              &nbsp;
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px;text-align:center;">
              ${emailLogo()}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px;color:${BRAND.text};">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background-color:${BRAND.footerBg};border-top:1px solid ${BRAND.cardBorder};text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:${BRAND.textLight};">
                &copy; Mini Task Manager
              </p>
              <p style="margin:0;font-size:11px;color:#cbd5e1;">
                Organize work. Ship faster.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
