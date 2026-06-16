import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a date as relative time (e.g. "2 hours ago", "yesterday"). */
export function formatRelativeTime(input: string | undefined): string {
  if (!input) return "";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const absMs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (absMs < minute) return rtf.format(-Math.round(diffMs / 1000), "second");
  if (absMs < hour) return rtf.format(-Math.round(diffMs / minute), "minute");
  if (absMs < day) return rtf.format(-Math.round(diffMs / hour), "hour");
  if (absMs < 7 * day) return rtf.format(-Math.round(diffMs / day), "day");
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

const MS_24H = 24 * 60 * 60 * 1000;
/** Returns true if the given date is within the last 24 hours. */
export function isWithinLast24h(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() < MS_24H;
}

/** Convert name to URL slug (e.g. "Acme Inc" → "acme-inc"). */
export function nameToSlug(name: string | undefined): string {
  if (!name || !name.trim()) return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Get initials from workspace or project name (e.g. "Acme Inc" → "AI"). */
export function getInitials(name: string | undefined): string {
  if (!name || !name.trim()) return "?";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const first = words[0][0];
    const last = words[words.length - 1][0];
    return `${first}${last}`.toUpperCase().slice(0, 2);
  }
  return name.slice(0, 2).toUpperCase();
}

const WORKSPACE_GRADIENTS = [
  "from-violet-500 via-indigo-500 to-purple-600",
  "from-fuchsia-500 via-violet-500 to-indigo-600",
  "from-sky-500 via-blue-500 to-indigo-600",
  "from-emerald-500 via-teal-500 to-cyan-600",
  "from-amber-500 via-orange-500 to-rose-500",
  "from-rose-500 via-pink-500 to-fuchsia-600",
] as const;

/** Stable gradient class for workspace initials avatars. */
export function getWorkspaceAvatarGradient(name: string | undefined): string {
  const source = (name ?? "?").trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = source.charCodeAt(i) + ((hash << 5) - hash);
  }
  return WORKSPACE_GRADIENTS[Math.abs(hash) % WORKSPACE_GRADIENTS.length];
}
