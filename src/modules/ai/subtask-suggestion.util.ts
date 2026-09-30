import { UnprocessableEntityException } from '@nestjs/common';
import { DEFAULT_AI_SUBTASK_MAX_SUGGESTIONS } from '../../config/configuration';

const DESCRIPTION_LIMIT = 4000;
const EXISTING_TITLE_LIMIT = 100;
export const SUBTASK_TITLE_MAX_LENGTH = 200;

export interface SubtaskSuggestionSource {
  title?: string | null;
  description?: string | null;
  subtasks?: Array<{ title?: string | null } | null> | null;
}

export interface PreparedSubtaskSuggestionInput {
  title: string;
  description: string;
  existingTitles: string[];
}

export interface SubtaskSuggestionItem {
  title: string;
}

export interface SubtaskSuggestionsPayload {
  suggestions: SubtaskSuggestionItem[];
}

export function stripHtmlToPlainText(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function clampPlainText(value: string, max = DESCRIPTION_LIMIT): string {
  const plain = stripHtmlToPlainText(value);
  return plain.length > max ? plain.slice(0, max) : plain;
}

/**
 * Data that may later be sent to an AI provider.
 * Works for a saved task or an unsaved create draft. Only title, plain description, and checklist titles.
 */
export function prepareSubtaskSuggestionInput(
  source: SubtaskSuggestionSource,
): PreparedSubtaskSuggestionInput {
  return {
    title: (source.title ?? '').trim().slice(0, 300),
    description: clampPlainText(source.description ?? ''),
    existingTitles: existingTitlesForPrompt((source.subtasks ?? []).map((item) => item?.title ?? '')),
  };
}

/** Trim, lowercase, collapse whitespace, and drop punctuation. */
export function normalizeSubtaskTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveMaxSubtaskSuggestions(value: number | null | undefined): number {
  if (!Number.isFinite(value) || value == null || value < 1) {
    return DEFAULT_AI_SUBTASK_MAX_SUGGESTIONS;
  }
  return Math.floor(value);
}

export function existingTitlesForPrompt(titles: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const title of titles) {
    const trimmed = title.trim().slice(0, SUBTASK_TITLE_MAX_LENGTH);
    const key = normalizeSubtaskTitle(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= EXISTING_TITLE_LIMIT) break;
  }
  return result;
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1].trim() : trimmed;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start >= 0 && end > start) return body.slice(start, end + 1);
  return body;
}

function titleFromSuggestion(item: unknown): string | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const title = (item as { title?: unknown }).title;
  if (typeof title !== 'string') return null;
  const trimmed = title.trim().slice(0, SUBTASK_TITLE_MAX_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Validate an untrusted model response. Unsupported fields are discarded.
 * Invalid items are dropped. The payload shape itself must be JSON with a suggestions array.
 */
export function validateSuggestionResponse(raw: string): SubtaskSuggestionsPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(raw));
  } catch {
    throw new UnprocessableEntityException('The AI response was not valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new UnprocessableEntityException('The AI response is missing suggestions.');
  }
  if (!Object.prototype.hasOwnProperty.call(parsed, 'suggestions')) {
    throw new UnprocessableEntityException('The AI response is missing suggestions.');
  }
  const suggestions = (parsed as { suggestions?: unknown }).suggestions;
  if (!Array.isArray(suggestions)) {
    throw new UnprocessableEntityException('The AI response suggestions field must be an array.');
  }
  return {
    suggestions: suggestions
      .map((item) => titleFromSuggestion(item))
      .filter((title): title is string => title != null)
      .map((title) => ({ title })),
  };
}

/** Parse model output into title-only suggestions. Extra fields are discarded. */
export function parseSuggestionPayload(raw: string): string[] {
  return validateSuggestionResponse(raw).suggestions.map((item) => item.title);
}

export function filterNewSubtaskTitles(
  suggestions: string[],
  existingTitles: string[],
  maxSuggestions?: number | null,
): string[] {
  const taken = new Set(
    existingTitles.map((title) => normalizeSubtaskTitle(title)).filter((title) => title.length > 0),
  );
  const kept: string[] = [];
  const limit = resolveMaxSubtaskSuggestions(maxSuggestions);
  for (const title of suggestions) {
    const trimmed = title.trim().slice(0, SUBTASK_TITLE_MAX_LENGTH);
    const key = normalizeSubtaskTitle(trimmed);
    if (!key || taken.has(key)) continue;
    taken.add(key);
    kept.push(trimmed);
    if (kept.length >= limit) break;
  }
  return kept;
}
