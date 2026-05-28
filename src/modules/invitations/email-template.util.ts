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

/** Table-based CTA button — only use for public HTTPS URLs (not localhost). */
export function emailActionButton(actionUrl: string, label: string): string {
  const href = escapeHtml(actionUrl);
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:32px auto;">
  <tr>
    <td align="center" bgcolor="#6366f1" style="border-radius:10px;background-color:#6366f1;">
      <a href="${href}" target="_blank" rel="noopener noreferrer"
         style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;line-height:1.2;color:#ffffff !important;text-decoration:none;border-radius:10px;background-color:#6366f1;">
        ${escapeHtml(label)}
      </a>
    </td>
  </tr>
</table>`.trim();
}

/** Plain URL fallback for production emails only. */
export function emailLinkFallback(actionUrl: string): string {
  if (isLocalhostUrl(actionUrl)) return '';

  const href = escapeHtml(actionUrl);
  return `
<p style="text-align:center;color:#64748b;font-size:13px;line-height:1.5;margin:24px 0 12px;">
  If the button above does not work, copy and paste this link into your browser:
</p>
<p style="text-align:center;margin:0;word-break:break-all;">
  <a href="${href}" target="_blank" rel="noopener noreferrer"
     style="color:#6366f1;font-size:14px;text-decoration:underline;">
    ${href}
  </a>
</p>`.trim();
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
  const codeLine = shortCode ? `\n\nYour verification code: ${shortCode}\n` : '';
  return `${intro}
${codeLine}
${actionUrl}

If the link is not clickable, copy and paste the URL above into your browser.`;
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
      <span style="display:inline-block;margin-top:6px;padding:8px 12px;background:#fff;border:1px solid #86efac;border-radius:6px;font-family:ui-monospace,monospace;font-size:13px;color:#15803d;word-break:break-all;">${page}</span>
    </li>
    <li>Paste the code and click <strong>Verify email</strong></li>
  </ol>`
    : `<p style="margin:0;font-size:14px;line-height:1.5;color:#166534;">
    Or enter this code at <strong>${page}</strong> if the button below does not work.
  </p>`;

  return `
<div style="margin:28px 0;padding:24px;background:#f0fdf4;border:2px solid #86efac;border-radius:12px;text-align:center;">
  <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#166534;text-transform:uppercase;letter-spacing:0.08em;">
    Your verification code
  </p>
  <p style="margin:0 0 16px;font-size:36px;font-weight:700;letter-spacing:0.25em;color:#15803d;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">
    ${code}
  </p>
  ${instructions}
</div>`.trim();
}

/** Button + link for production; omitted for localhost (Gmail disables those links). */
export function emailActionSection(actionUrl: string, label: string): string {
  if (isLocalhostUrl(actionUrl)) return '';
  return `${emailActionButton(actionUrl, label)}\n${emailLinkFallback(actionUrl)}`;
}

/** Verify-email CTA — same localhost guard as invitations. */
export function emailVerificationActions(verifyUrl: string): string {
  return emailActionSection(verifyUrl, 'Verify Email');
}

export function emailLayout(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mini Task Manager</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#1a1a2e;background-color:#ffffff;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="display:inline-block;width:48px;height:48px;border-radius:12px;background-color:#6366f1;line-height:48px;color:#fff;font-weight:700;font-size:20px;">M</div>
  </div>
  ${bodyHtml}
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;" />
  <p style="text-align:center;color:#cbd5e1;font-size:12px;margin:0;">Mini Task Manager</p>
</body>
</html>`.trim();
}
