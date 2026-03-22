/**
 * Large set of SVG data URLs for project icons (gradient + emoji).
 */

export interface ProjectIconPreset {
  id: string;
  dataUrl: string;
}

function svgGradientEmoji(color1: string, color2: string, emoji: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="${color1}"/>` +
    `<stop offset="100%" stop-color="${color2}"/></linearGradient></defs>` +
    `<rect width="64" height="64" rx="14" fill="url(#g)"/>` +
    `<text x="32" y="40" text-anchor="middle" font-size="28">${emoji}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const EMOJIS = [
  "\u{1F3E2}", "\u{1F680}", "\u{1F4A1}", "\u{26A1}", "\u{1F4CA}", "\u{1F3AF}", "\u{1F3A8}", "\u{1F91D}", "\u{1F4BB}", "\u{1F525}",
  "\u{1F33F}", "\u{2728}", "\u{1F4F1}", "\u{1F6E0}", "\u{1F4C8}", "\u{1F3AC}", "\u{1F4DD}", "\u{1F512}", "\u{1F30D}", "\u{2B50}",
  "\u{1F340}", "\u{1F3AE}", "\u{1F3C6}", "\u{1F4DA}", "\u{1F514}", "\u{2602}", "\u{1F3B5}", "\u{1F3E0}", "\u{2708}", "\u{1F9E0}",
  "\u{1F4E6}", "\u{1F511}", "\u{1F5BC}", "\u{1F4AC}", "\u{1F9E9}", "\u{1F308}", "\u{1F98A}", "\u{1F419}", "\u{1F30A}", "\u{2600}",
  "\u{1F3AA}", "\u{1F4CC}", "\u{1F5C2}", "\u{2699}", "\u{1F381}", "\u{1F52E}", "\u{1F338}", "\u{1F355}", "\u{26C5}", "\u{1F393}",
  "\u{1F9EA}", "\u{1F5FA}", "\u{1F3A4}", "\u{1F3D6}", "\u{1F48E}", "\u{1F52D}", "\u{1F319}", "\u{1F334}", "\u{1F3B9}", "\u{1F6B4}",
] as const;

function gradientPairs(): [string, string][] {
  const pairs: [string, string][] = [];
  for (let h = 0; h < 360; h += 10) {
    pairs.push([`hsl(${h}, 72%, 42%)`, `hsl(${(h + 36) % 360}, 68%, 52%)`]);
  }
  return pairs;
}

function buildPresets(): ProjectIconPreset[] {
  const out: ProjectIconPreset[] = [];
  let n = 0;
  for (const [c1, c2] of gradientPairs()) {
    for (const emoji of EMOJIS) {
      out.push({ id: `pi-${n}`, dataUrl: svgGradientEmoji(c1, c2, emoji) });
      n += 1;
    }
  }
  return out;
}

let _cache: ProjectIconPreset[] | null = null;

export function getProjectIconPresets(): ProjectIconPreset[] {
  if (!_cache) _cache = buildPresets();
  return _cache;
}

const HUES = Math.ceil(360 / 10);
export const PROJECT_ICON_PRESET_COUNT = HUES * EMOJIS.length;
