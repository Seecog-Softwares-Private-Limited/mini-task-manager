import type { ActivityLog } from "@/types/api";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRightLeft,
  Pencil,
  PlusCircle,
  Trash2,
  UserCheck,
  UserPlus,
} from "lucide-react";

const ACTION_PAST_TENSE: Record<string, string> = {
  create: "created",
  update: "updated",
  move: "moved",
  delete: "deleted",
  invite: "invited",
  join: "joined",
  remove: "removed",
  archive: "archived",
  restore: "restored",
};

function capitalizeWord(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/** Turn IN_PROGRESS, in-progress, or raw status slugs into readable labels. */
export function formatActivityLabel(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const normalized = raw.trim().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
  if (/^[A-Z0-9\s]+$/.test(normalized)) {
    return normalized
      .toLowerCase()
      .split(" ")
      .map((word) => capitalizeWord(word))
      .join(" ");
  }
  return normalized
    .split(" ")
    .map((word) => capitalizeWord(word))
    .join(" ");
}

export function activityActorName(log: ActivityLog): string {
  const full = log.user?.fullName?.trim();
  if (full) {
    const first = full.split(/\s+/)[0];
    return capitalizeWord(first);
  }
  const email = log.user?.email?.split("@")[0];
  if (email) return capitalizeWord(email.replace(/[._-]+/g, " ").split(/\s+/)[0] ?? email);
  return "Someone";
}

/** Normalize task/project titles for display in activity sentences. */
export function formatActivityEntityName(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  let s = raw.trim();
  s = s.replace(/\s*\+\s*/g, " + ");
  s = s.replace(/\s*\/\s*/g, " / ");
  s = s.replace(/([A-Za-z0-9])([+/])/g, "$1 $2");
  s = s.replace(/([+/])([A-Za-z0-9])/g, "$1 $2");
  return s.replace(/\s{2,}/g, " ").trim();
}

function entityName(meta: Record<string, unknown>): string | undefined {
  const raw = (meta.name ?? meta.title ?? meta.taskName ?? meta.projectName) as
    | string
    | undefined;
  return formatActivityEntityName(raw);
}

function quotedName(name: string | undefined): string {
  if (!name) return "";
  return `"${name}"`;
}

export function formatActivityHumanReadable(log: ActivityLog): string {
  const actor = activityActorName(log);
  const action = log.action?.toLowerCase().trim() ?? "";
  const entity = log.entityType?.toLowerCase().trim() ?? "";
  const meta = (log.metadata ?? {}) as Record<string, unknown>;
  const name = entityName(meta);
  const toStatus = formatActivityLabel(
    (meta.toStatus ?? meta.status ?? meta.toColumn ?? meta.columnName ?? meta.toStatusName) as
      | string
      | undefined
  );

  if (entity === "project") {
    if (action === "create") return `${actor} created project ${quotedName(name)}`.trim();
    if (action === "update") return `${actor} updated project ${quotedName(name)}`.trim();
    if (action === "delete") return `${actor} deleted a project`;
    if (action === "archive") return `${actor} archived project ${quotedName(name)}`.trim();
  }
  if (entity === "task") {
    if (action === "create") return `${actor} created task ${quotedName(name)}`.trim();
    if (action === "update") return `${actor} updated task ${quotedName(name)}`.trim();
    if (action === "move") {
      const subject = name ? quotedName(name) : "a task";
      return toStatus
        ? `${actor} moved ${subject} to ${toStatus}`
        : `${actor} moved ${subject}`.trim();
    }
    if (action === "delete") return `${actor} deleted task ${quotedName(name)}`.trim();
  }
  if (entity === "organization") {
    if (action === "create") return `${actor} created the workspace`;
    if (action === "update") return `${actor} updated workspace settings`;
  }
  if (entity === "member" || entity === "invitation") {
    if (action === "invite") return `${actor} invited a member`;
    if (action === "join") return `${actor} joined the workspace`;
    if (action === "remove") return `${actor} removed a member`;
  }

  const detail = meta.details as string | undefined;
  if (detail?.trim()) {
    const cleaned = detail.trim();
    if (/^[a-z_]+$/i.test(cleaned) && !cleaned.includes(" ")) {
      return `${actor} ${ACTION_PAST_TENSE[cleaned.toLowerCase()] ?? cleaned} ${entity.replace(/_/g, " ")}`;
    }
    return `${actor} ${cleaned}`;
  }

  const past = ACTION_PAST_TENSE[action] ?? action;
  const entityLabel = entity ? entity.replace(/_/g, " ") : "item";
  if (name) return `${actor} ${past} ${entityLabel} ${quotedName(name)}`.trim();
  return `${actor} ${past} ${entityLabel}`.trim() || `${actor} performed an action`;
}

export type ActivityVisual = {
  icon: LucideIcon;
  iconClassName: string;
  bgClassName: string;
};

export function getActivityVisual(log: ActivityLog): ActivityVisual {
  const action = log.action?.toLowerCase() ?? "";

  if (action === "invite") {
    return {
      icon: UserPlus,
      iconClassName: "text-emerald-600 dark:text-emerald-400",
      bgClassName: "bg-emerald-500/10",
    };
  }
  if (action === "join") {
    return {
      icon: UserCheck,
      iconClassName: "text-emerald-600 dark:text-emerald-400",
      bgClassName: "bg-emerald-500/10",
    };
  }
  if (action === "create") {
    return {
      icon: PlusCircle,
      iconClassName: "text-emerald-600 dark:text-emerald-400",
      bgClassName: "bg-emerald-500/10",
    };
  }
  if (action === "update") {
    return {
      icon: Pencil,
      iconClassName: "text-blue-600 dark:text-blue-400",
      bgClassName: "bg-blue-500/10",
    };
  }
  if (action === "move") {
    return {
      icon: ArrowRightLeft,
      iconClassName: "text-violet-600 dark:text-violet-400",
      bgClassName: "bg-violet-500/10",
    };
  }
  if (action === "delete" || action === "remove") {
    return {
      icon: Trash2,
      iconClassName: "text-red-600 dark:text-red-400",
      bgClassName: "bg-red-500/10",
    };
  }

  return {
    icon: Activity,
    iconClassName: "text-muted-foreground",
    bgClassName: "bg-muted/50",
  };
}
