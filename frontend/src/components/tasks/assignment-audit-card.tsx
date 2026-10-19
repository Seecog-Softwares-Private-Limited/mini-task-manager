"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { normalizeAssigneeUserId } from "@/lib/task-assignees";

export type AuditMemberHint = {
  userId: string;
  name: string;
  role?: string;
  avatarUrl?: string;
};

function formatAuditDateTime(raw?: string | null): string {
  if (!raw?.trim()) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw.trim();
  const day = parsed.getDate();
  const suffix =
    day >= 11 && day <= 13
      ? "th"
      : day % 10 === 1
        ? "st"
        : day % 10 === 2
          ? "nd"
          : day % 10 === 3
            ? "rd"
            : "th";
  const monthYear = parsed.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
  const time = parsed
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    .toLowerCase();
  return `${day}${suffix} ${monthYear}, ${time}`;
}

function formatRole(role?: string | null): string {
  const r = (role ?? "").trim().toLowerCase();
  if (!r) return "";
  if (r === "contributor") return "member";
  return r;
}

export interface AssignmentAuditCardProps {
  members: AuditMemberHint[];
  raisedByUserId?: string | null;
  raisedAt?: string | null;
  updatedByUserId?: string | null;
  updatedAt?: string | null;
  assigneeIds?: string[];
  assignedAt?: string | null;
  className?: string;
}

type AuditRowData = {
  label: string;
  name: string;
  role?: string;
  dateTime?: string;
  trailing?: string;
  plain?: boolean;
};

function AuditRow({ label, name, role, dateTime, trailing, plain }: AuditRowData) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground">
        {label} :
      </p>
      {plain ? (
        <p className="mt-0.5 text-sm font-bold leading-snug text-foreground">{name}</p>
      ) : (
        <>
          <p className="mt-0.5 min-w-0 text-sm font-bold leading-snug text-foreground">
            <span className="break-words">{name}</span>
            {role ? (
              <span className="font-semibold text-muted-foreground"> ({role})</span>
            ) : null}
            {trailing ? (
              <span className="font-semibold text-muted-foreground"> {trailing}</span>
            ) : null}
          </p>
          {dateTime ? (
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">{dateTime}</p>
          ) : null}
        </>
      )}
    </div>
  );
}

export function AssignmentAuditCard({
  members,
  raisedByUserId,
  raisedAt,
  updatedByUserId,
  updatedAt,
  assigneeIds = [],
  assignedAt,
  className,
}: AssignmentAuditCardProps) {
  const byId = React.useMemo(() => {
    const map = new Map<string, AuditMemberHint>();
    for (const m of members) {
      const key = normalizeAssigneeUserId(m.userId);
      if (!key) continue;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, m);
        continue;
      }
      const orgRoles = new Set(["owner", "admin", "member"]);
      if (
        !orgRoles.has((existing.role ?? "").toLowerCase()) &&
        orgRoles.has((m.role ?? "").toLowerCase())
      ) {
        map.set(key, m);
      }
    }
    return map;
  }, [members]);

  const resolve = (userId?: string | null) => {
    const key = normalizeAssigneeUserId(userId ?? undefined);
    if (!key) return null;
    return byId.get(key) ?? null;
  };

  const cleanAssignees = assigneeIds.map((id) => id.trim()).filter(Boolean);
  const hasRaised = Boolean(raisedByUserId?.trim() || raisedAt?.trim());
  const hasRealUpdate = Boolean(updatedByUserId?.trim());
  const hasAssigned = cleanAssignees.length > 0 || Boolean(assignedAt?.trim());
  if (!hasRaised && !hasRealUpdate && !hasAssigned) return null;

  const raised = resolve(raisedByUserId);
  const updated = resolve(updatedByUserId);
  const firstAssignee = resolve(cleanAssignees[0]);
  const avatar = raised ?? firstAssignee ?? updated;

  const rows: AuditRowData[] = [];
  if (hasRaised) {
    rows.push({
      label: "Raised By",
      name: raised?.name ?? "Unknown",
      role: formatRole(raised?.role),
      dateTime: formatAuditDateTime(raisedAt) || undefined,
    });
  }
  rows.push(
    hasRealUpdate
      ? {
          label: "Last Updated",
          name: updated?.name ?? "Unknown",
          role: formatRole(updated?.role),
          dateTime: formatAuditDateTime(updatedAt) || undefined,
        }
      : { label: "Last Updated", name: "none", plain: true }
  );
  if (hasAssigned) {
    rows.push({
      label: "Assigned To",
      name:
        cleanAssignees.length === 0
          ? "Unassigned"
          : (firstAssignee?.name ?? "Unknown"),
      role:
        cleanAssignees.length === 0 ? undefined : formatRole(firstAssignee?.role),
      dateTime: formatAuditDateTime(assignedAt) || undefined,
      trailing: cleanAssignees.length > 1 ? `+${cleanAssignees.length - 1}` : undefined,
    });
  }

  return (
    <div
      className={cn(
        "flex w-full gap-2 rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-indigo-500/5 px-2.5 py-2.5",
        className
      )}
    >
      <Avatar className="mt-0.5 h-9 w-9 shrink-0 shadow-sm ring-2 ring-background">
        <AvatarImage src={avatar?.avatarUrl} />
        <AvatarFallback className="text-xs">
          {(avatar?.name ?? "?").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        {rows.map((row, index) => (
          <React.Fragment key={row.label}>
            {index > 0 ? (
              <div className="my-1.5 h-px bg-violet-500/15" aria-hidden />
            ) : null}
            <AuditRow {...row} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
