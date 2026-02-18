/**
 * Feature tour "seen" state per user (localStorage). Show once per user.
 */

const PREFIX = "mini_tm_tour_";

export function getTourSeen(tourId: string): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(PREFIX + tourId) === "1";
}

export function setTourSeen(tourId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFIX + tourId, "1");
}

export const TOUR_IDS = {
  kanban: "kanban",
  datatable: "datatable",
  whatsNew: "whats_new",
} as const;
