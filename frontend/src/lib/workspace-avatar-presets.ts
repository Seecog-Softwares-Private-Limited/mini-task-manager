/**
 * Preset workspace logos as compact SVG data URLs (stored as `logoUrl` on create).
 * Keeps payloads small and under backend MaxLength for logoUrl.
 */

export interface WorkspaceAvatarPreset {
  id: string;
  /** Screen reader label */
  label: string;
  /** `data:image/svg+xml,...` */
  dataUrl: string;
}

function svgGradientEmoji(
  color1: string,
  color2: string,
  emoji: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${color1}"/><stop offset="100%" stop-color="${color2}"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#g)"/><text x="32" y="40" text-anchor="middle" font-size="30">${emoji}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const PRESET_DEFS: Array<{ id: string; label: string; c1: string; c2: string; emoji: string }> = [
  { id: "violet-office", label: "Violet office", c1: "#6366f1", c2: "#8b5cf6", emoji: "🏢" },
  { id: "blue-rocket", label: "Blue rocket", c1: "#2563eb", c2: "#06b6d4", emoji: "🚀" },
  { id: "green-nature", label: "Green nature", c1: "#059669", c2: "#34d399", emoji: "🌿" },
  { id: "amber-spark", label: "Amber spark", c1: "#d97706", c2: "#f59e0b", emoji: "✨" },
  { id: "rose-creative", label: "Rose creative", c1: "#db2777", c2: "#f472b6", emoji: "🎨" },
  { id: "slate-target", label: "Slate target", c1: "#475569", c2: "#64748b", emoji: "🎯" },
  { id: "indigo-idea", label: "Indigo idea", c1: "#4f46e5", c2: "#818cf8", emoji: "💡" },
  { id: "teal-bolt", label: "Teal bolt", c1: "#0d9488", c2: "#2dd4bf", emoji: "⚡" },
  { id: "red-chart", label: "Red chart", c1: "#dc2626", c2: "#f87171", emoji: "📊" },
  { id: "purple-handshake", label: "Purple handshake", c1: "#7c3aed", c2: "#a78bfa", emoji: "🤝" },
  { id: "sky-code", label: "Sky code", c1: "#0284c7", c2: "#38bdf8", emoji: "💻" },
  { id: "orange-flame", label: "Orange flame", c1: "#ea580c", c2: "#fb923c", emoji: "🔥" },
];

export const WORKSPACE_AVATAR_PRESETS: WorkspaceAvatarPreset[] = PRESET_DEFS.map(
  ({ id, label, c1, c2, emoji }) => ({
    id,
    label,
    dataUrl: svgGradientEmoji(c1, c2, emoji),
  })
);

export function findPresetByDataUrl(dataUrl: string | null): WorkspaceAvatarPreset | undefined {
  if (!dataUrl) return undefined;
  return WORKSPACE_AVATAR_PRESETS.find((p) => p.dataUrl === dataUrl);
}
