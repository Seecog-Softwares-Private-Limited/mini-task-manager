import { stripHtmlToPlainText } from "@/lib/project-description-plain";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "ul",
  "ol",
  "li",
  "a",
  "h1",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "code",
  "pre",
  "span",
];

const ALLOWED_ATTR = ["href", "class"];

const PURIFY_OPTIONS = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOW_DATA_ATTR: false,
} as const;

/** SSR / build-time sanitizer — no jsdom (avoids ERR_REQUIRE_ESM on Linux CI). */
function sanitizeTaskDescriptionHtmlServer(html: string): string {
  if (!html?.trim()) return "";
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(
      /<\/?(script|style|iframe|object|embed|form|input|button|link|meta|base|svg|math)[^>]*>/gi,
      "",
    )
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

type DomPurifyLike = { sanitize: (html: string, cfg: typeof PURIFY_OPTIONS) => string };

let browserPurify: DomPurifyLike | null = null;

function getBrowserPurify(): DomPurifyLike {
  if (browserPurify) return browserPurify;
  // Lazy require — never loads jsdom; only evaluated in the browser.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  browserPurify = require("dompurify") as DomPurifyLike;
  return browserPurify;
}

/** Safe HTML for task description (read view). */
export function sanitizeTaskDescriptionHtml(html: string): string {
  if (typeof window === "undefined") {
    return sanitizeTaskDescriptionHtmlServer(html);
  }
  return getBrowserPurify().sanitize(html, PURIFY_OPTIONS);
}

/** Rough plain-text length for “show more” / previews (works without DOM). */
export function taskDescriptionPlainLength(htmlOrText: string): number {
  return stripHtmlToPlainText(htmlOrText).length;
}

/** Detect stored rich text vs legacy plain description. */
export function taskDescriptionLooksLikeHtml(s: string): boolean {
  return /<[a-z][\s\S]*>/i.test(s.trim());
}

/** Normalize empty editor output for API / compare. */
export function normalizeDescriptionHtml(html: string): string {
  const t = html.trim();
  if (!t) return "";
  const plain = taskDescriptionPlainLength(t);
  if (plain === 0) return "";
  return t;
}
