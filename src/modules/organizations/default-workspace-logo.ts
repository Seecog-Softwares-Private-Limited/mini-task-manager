/**
 * Default workspace logo (matches frontend `DEFAULT_WORKSPACE_AVATAR` / violet-office).
 * Applied when creating an organization with no logoUrl.
 */
function svgGradientEmoji(color1: string, color2: string, emoji: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${color1}"/><stop offset="100%" stop-color="${color2}"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#g)"/><text x="32" y="40" text-anchor="middle" font-size="30">${emoji}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_WORKSPACE_LOGO_URL = svgGradientEmoji('#6366f1', '#8b5cf6', '🏢');

export function resolveWorkspaceLogoUrl(logoUrl?: string | null): string {
  const trimmed = logoUrl?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_WORKSPACE_LOGO_URL;
}
