"use client";

import { Archive, Building2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyVariant = "none" | "archived" | "active";

export function WorkspaceEmptyState({
  variant,
  onCreate,
  onShowAll,
}: {
  variant: EmptyVariant;
  onCreate?: () => void;
  onShowAll?: () => void;
}) {
  const config = {
    none: {
      icon: Sparkles,
      iconClass: "text-violet-500/70",
      ringClass: "from-violet-500/15 via-indigo-500/10 to-fuchsia-500/10",
      title: "No workspaces yet",
      description: "Create your first workspace to organize projects, tasks, and your team in one place.",
      action: "create" as const,
    },
    archived: {
      icon: Archive,
      iconClass: "text-slate-500/70",
      ringClass: "from-slate-500/10 via-slate-400/5 to-slate-500/10",
      title: "No archived workspaces",
      description: "When you archive a workspace, it will appear here so you can restore it later.",
      action: "showAll" as const,
    },
    active: {
      icon: Building2,
      iconClass: "text-amber-500/70",
      ringClass: "from-amber-500/10 via-orange-500/5 to-rose-500/10",
      title: "No active workspaces",
      description: "All of your workspaces are archived. Restore one or create a new workspace to continue.",
      action: "showAll" as const,
    },
  }[variant];

  const Icon = config.icon;

  return (
    <div
      className={cn(
        "col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center",
        "border-slate-300/70 bg-gradient-to-b from-white via-white to-slate-50/80",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-border/60 dark:from-card/40 dark:via-card/30 dark:to-muted/10"
      )}
    >
      <div
        className={cn(
          "mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 ring-black/[0.04] dark:ring-white/[0.06]",
          config.ringClass
        )}
      >
        <Icon className={cn("h-7 w-7", config.iconClass)} aria-hidden />
      </div>
      <p className="text-base font-semibold tracking-tight text-foreground">{config.title}</p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{config.description}</p>
      {config.action === "create" && onCreate ? (
        <Button onClick={onCreate} size="sm" className="mt-5 rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          New Workspace
        </Button>
      ) : onShowAll ? (
        <Button variant="outline" size="sm" className="mt-5 rounded-xl" onClick={onShowAll}>
          Show all workspaces
        </Button>
      ) : null}
    </div>
  );
}
