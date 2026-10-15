import type { Task } from "@/types/api";

const PRIORITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export type BoardSortBy =
  | "urgency"
  | "created"
  | "priority"
  | "dueDate"
  | "title"
  | "completed";
export type BoardSortDir = "asc" | "desc";

export type BoardSortOptions = {
  /** Map of workflow status id → type (TODO / IN_PROGRESS / DONE / …). */
  statusTypeById?: Record<string, string | null | undefined>;
};

function normalizeStatusType(raw: string | null | undefined): string {
  return (raw ?? "").trim().toUpperCase().replace(/-/g, "_");
}

function isDoneStatusType(type: string): boolean {
  return type === "DONE" || type === "CANCELLED" || type === "CANCELED";
}

function isInProgressStatusType(type: string): boolean {
  return type === "IN_PROGRESS" || type === "INPROGRESS" || type === "PROGRESS";
}

function statusTypeOf(
  task: Task,
  statusTypeById?: Record<string, string | null | undefined>
): string {
  if (!statusTypeById) return "";
  const fromId = statusTypeById[task.statusId ?? ""];
  if (fromId) return normalizeStatusType(fromId);
  return "";
}

/**
 * Default list/board card order:
 * 1. Critical (open)
 * 2. In Progress (open, non-critical)
 * 3. Other open tasks (by priority)
 * 4. Done / cancelled at the bottom
 */
export function compareTasksByDisplayOrder(
  a: Task,
  b: Task,
  statusTypeById?: Record<string, string | null | undefined>
): number {
  const aType = statusTypeOf(a, statusTypeById);
  const bType = statusTypeOf(b, statusTypeById);
  const aDone = isDoneStatusType(aType) || Boolean(a.completedAt);
  const bDone = isDoneStatusType(bType) || Boolean(b.completedAt);
  if (aDone !== bDone) return aDone ? 1 : -1;

  const aCrit = (a.priority ?? "").toUpperCase() === "CRITICAL";
  const bCrit = (b.priority ?? "").toUpperCase() === "CRITICAL";
  if (aCrit !== bCrit) return aCrit ? -1 : 1;

  const aProg = isInProgressStatusType(aType);
  const bProg = isInProgressStatusType(bType);
  if (aProg !== bProg) return aProg ? -1 : 1;

  const pa = PRIORITY_ORDER[(a.priority ?? "").toUpperCase()] ?? 99;
  const pb = PRIORITY_ORDER[(b.priority ?? "").toUpperCase()] ?? 99;
  if (pa !== pb) return pa - pb;

  const dueCmp = (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
  if (dueCmp !== 0) return dueCmp;

  return a.title.localeCompare(b.title);
}

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
  sortDir: BoardSortDir | string,
  options?: BoardSortOptions
): Task[] {
  const sorted = [...tasks];
  const statusTypeById = options?.statusTypeById;
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "urgency":
        cmp = compareTasksByDisplayOrder(a, b, statusTypeById);
        break;
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
    // Urgency order is always Critical → In Progress → Done; ignore desc flip.
    if (sortBy === "urgency") return cmp;
    return sortDir === "desc" ? -cmp : cmp;
  });
  return sorted;
}
