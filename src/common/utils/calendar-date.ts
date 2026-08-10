/**
 * Serialize MySQL DATE / JS Date as calendar YYYY-MM-DD.
 * Avoids ISO midnight timezone shifts that move "due today" into overdue.
 */
export function formatCalendarDate(
  value: Date | string | null | undefined,
): string | undefined {
  if (value == null || value === '') return undefined;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match && trimmed.length === 10) return match[1];
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return formatLocalYmd(parsed);
    }
    return match?.[1];
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatLocalYmd(value);
  }

  return undefined;
}

function formatLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
