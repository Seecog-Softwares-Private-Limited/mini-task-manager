import DOMPurify from "isomorphic-dompurify";

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

/** Safe HTML for task description (read view). */
export function sanitizeTaskDescriptionHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

/** Rough plain-text length for “show more” / previews (works without DOM). */
export function taskDescriptionPlainLength(htmlOrText: string): number {
  if (!htmlOrText) return 0;
  const text = htmlOrText
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  return text.length;
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
