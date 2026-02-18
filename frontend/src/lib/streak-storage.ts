/**
 * Optional: daily visit streak. Persisted in localStorage per user (no org).
 */

const KEY = "mini_tm_streak";

type StreakState = {
  lastVisitDate: string; // YYYY-MM-DD
  count: number;
};

export function getStreak(): StreakState {
  if (typeof window === "undefined") return { lastVisitDate: "", count: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { lastVisitDate: "", count: 0 };
    return JSON.parse(raw);
  } catch {
    return { lastVisitDate: "", count: 0 };
  }
}

export function recordVisit(): { count: number; isNewDay: boolean } {
  const today = new Date().toISOString().slice(0, 10);
  const prev = getStreak();
  if (prev.lastVisitDate === today) return { count: prev.count, isNewDay: false };
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const nextCount = prev.lastVisitDate === yesterday ? prev.count + 1 : 1;
  const next: StreakState = { lastVisitDate: today, count: nextCount };
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(next));
  return { count: nextCount, isNewDay: true };
}
