import type { Task } from "@/types/api";

const PRIORITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export type BoardSortBy = "created" | "priority" | "dueDate" | "title" | "completed";
export type BoardSortDir = "asc" | "desc";

function compareCompletedAt(a: Task, b: Task): number {
  const aDate = a.completedAt ?? null;
  const bDate = b.completedAt ?? null;
  if (!aDate && !bDate) return 0;
  if (!aDate) return 1;
  if (!bDate) return -1;
  return aDate.localeCompare(bDate);
}

export function applyBoardSorting(
  tasks: Task[],
  sortBy: BoardSortBy | string,
  sortDir: BoardSortDir | string
): Task[] {
  const sorted = [...tasks];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "priority":
        cmp =
          (PRIORITY_ORDER[a.priority?.toUpperCase() ?? ""] ?? 99) -
          (PRIORITY_ORDER[b.priority?.toUpperCase() ?? ""] ?? 99);
        break;
      case "dueDate":
        cmp = (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
        break;
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "completed":
        cmp = compareCompletedAt(a, b);
        break;
      default:
        cmp = a.createdAt.localeCompare(b.createdAt);
        break;
    }
    return sortDir === "desc" ? -cmp : cmp;
  });
  return sorted;
}
