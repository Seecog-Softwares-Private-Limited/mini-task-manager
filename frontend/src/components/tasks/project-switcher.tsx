"use client";

import type { Project } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { FolderKanban } from "lucide-react";

interface ProjectSwitcherProps {
  projects: Project[];
  selectedProjectId: string | null;
  selectedTaskCount?: number;
  onProjectChange: (projectId: string) => void;
  disabled?: boolean;
}

export function ProjectSwitcher({
  projects,
  selectedProjectId,
  selectedTaskCount,
  onProjectChange,
  disabled,
}: ProjectSwitcherProps) {
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <Select
      value={selectedProjectId ?? ""}
      onValueChange={onProjectChange}
      disabled={disabled || projects.length === 0}
    >
      <SelectTrigger className="h-9 min-w-[240px] max-w-[360px]">
        <div className="flex min-w-0 items-center gap-2">
          <FolderKanban className="h-4 w-4 text-primary shrink-0" />
          <span className="truncate text-sm font-medium">
            {selectedProject?.name ?? "Select a project"}
          </span>
          {selectedProjectId && selectedTaskCount != null && (
            <Badge
              variant="secondary"
              className="ml-auto shrink-0 text-[10px] px-1.5 py-0.5"
            >
              {selectedTaskCount}
            </Badge>
          )}
        </div>
      </SelectTrigger>
      <SelectContent>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            <span className="truncate">{project.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
