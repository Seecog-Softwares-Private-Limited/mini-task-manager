/** Shared helpers for notify-before due reminders (Asia/Kolkata wall clock). */

export function parseHHmm(raw?: string | null): string | null {
  if (!raw) return null;
  const t = String(raw).trim().slice(0, 5);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : null;
}

/**
 * True when now is at/after (due − lead) and before (due + 2m grace).
 * Dedup must be handled by the caller (sent keys / reminderSentFor).
 */
export function isInRemindWindow(
  dueYmd: string,
  dueTime: string,
  notifyMinutesBefore: number,
  nowMs: number,
): boolean {
  const dueAtMs = Date.parse(`${dueYmd}T${dueTime}:00+05:30`);
  if (!Number.isFinite(dueAtMs)) return false;
  const remindAtMs = dueAtMs - notifyMinutesBefore * 60_000;
  const graceAfterDueMs = 2 * 60_000;
  return nowMs >= remindAtMs && nowMs < dueAtMs + graceAfterDueMs;
}

export function reminderWindowKey(dueYmd: string, dueTime: string): string {
  return `${dueYmd}T${dueTime}`;
}

export function assigneeIdsForItem(item: {
  assigneeId?: string | null;
  assigneeIds?: string[] | null;
}): string[] {
  const list =
    item.assigneeIds?.length
      ? item.assigneeIds
      : item.assigneeId
        ? [item.assigneeId]
        : [];
  return [
    ...new Set(list.map((id) => String(id ?? '').trim()).filter(Boolean)),
  ];
}

export function normalizeNotifyMinutes(
  raw: unknown,
  hasDueTime: boolean,
): number | null {
  if (!hasDueTime) return null;
  if (raw == null || Number.isNaN(Number(raw))) return null;
  return Math.max(0, Math.min(24 * 60, Number(raw)));
}

export function isSubtaskDone(item: {
  completed?: boolean;
  status?: string | null;
}): boolean {
  if (item.completed === true) return true;
  return String(item.status ?? '').toUpperCase() === 'DONE';
}

/** Coerce DATE / string / Date into YYYY-MM-DD (UTC for Date objects). */
export function coerceDueYmd(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const s = raw.trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  }
  if (raw instanceof Date && Number.isFinite(raw.getTime())) {
    return `${raw.getUTCFullYear()}-${String(raw.getUTCMonth() + 1).padStart(2, '0')}-${String(
      raw.getUTCDate(),
    ).padStart(2, '0')}`;
  }
  const s = String(raw).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}
