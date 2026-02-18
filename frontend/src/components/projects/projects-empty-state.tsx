"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export interface ProjectsEmptyStateProps {
  onCreateClick: () => void;
  canCreate: boolean;
  onUpgradeClick?: () => void;
}

function ProjectsIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Background circle */}
      <circle cx="100" cy="70" r="55" className="fill-primary/5" />
      {/* Main folder */}
      <path
        d="M60 45h50l15 15v45H60V45z"
        className="fill-primary/15 stroke-primary/30"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M60 45h50l15 15"
        className="stroke-primary/40"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Smaller folders */}
      <path
        d="M95 65h45l12 12v38H95V65z"
        className="fill-primary/10 stroke-primary/25"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M95 65h45l12 12"
        className="stroke-primary/30"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M75 75h35l10 10v28H75V75z"
        className="fill-primary/10 stroke-primary/25"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M75 75h35l10 10"
        className="stroke-primary/30"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Folder tab accent */}
      <rect x="62" y="42" width="20" height="4" rx="1" className="fill-primary/25" />
    </svg>
  );
}

export function ProjectsEmptyState({
  onCreateClick,
  canCreate,
  onUpgradeClick,
}: ProjectsEmptyStateProps) {
  return (
    <div className="flex min-h-[420px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-gradient-to-b from-muted/20 to-muted/5 px-6 py-16 text-center animate-in fade-in duration-500">
      <div className="mx-auto flex max-w-md flex-col items-center gap-6">
        {/* Illustration */}
        <div className="relative">
          <ProjectsIllustration className="h-36 w-auto sm:h-44" />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            No projects yet
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Create your first project to organize tasks, track progress, and collaborate with your team.
          </p>
          <p className="text-xs text-muted-foreground/80">
            Projects keep work organized by initiative, campaign, or team. Add one to get started.
          </p>
        </div>

        {/* Action */}
        <Button
          size="lg"
          onClick={canCreate ? onCreateClick : onUpgradeClick}
          className="gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          {canCreate ? "Create project" : "Upgrade to create projects"}
        </Button>
      </div>
    </div>
  );
}
