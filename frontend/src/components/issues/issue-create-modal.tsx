"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchProjects } from "@/services/api/projects.api";
import { fetchSites } from "@/services/api/sites.api";
import { useTenant } from "@/context/tenant-context";
import type { CreateIssuePayload } from "@/services/api/issues.api";
import type { IssueSeverity } from "@/types/api";

const SEVERITIES: { value: IssueSeverity; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

export interface IssueCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateIssuePayload) => void | Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
  /** Pre-select a project (e.g. opened from a project's page). */
  defaultProjectId?: string;
}

export function IssueCreateModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  error,
  defaultProjectId,
}: IssueCreateModalProps) {
  const { orgId } = useTenant();
  const [projectId, setProjectId] = React.useState("");
  const [siteId, setSiteId] = React.useState<string>("none");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [severity, setSeverity] = React.useState<IssueSeverity>("MEDIUM");

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    enabled: open,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites", orgId ?? ""],
    queryFn: fetchSites,
    enabled: open && !!orgId,
  });

  React.useEffect(() => {
    if (open) {
      setProjectId(defaultProjectId ?? "");
      setSiteId("none");
      setTitle("");
      setDescription("");
      setSeverity("MEDIUM");
    }
  }, [open, defaultProjectId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!projectId || !trimmedTitle) return;
    onSubmit({
      projectId,
      siteId: siteId === "none" ? undefined : siteId,
      title: trimmedTitle,
      description: description.trim() || undefined,
      severity,
    });
  };

  const canSubmit = !!projectId && !!title.trim() && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[480px]"
        aria-labelledby="issue-modal-title"
        aria-describedby="issue-modal-desc"
      >
        <DialogHeader>
          <DialogTitle id="issue-modal-title">New issue</DialogTitle>
          <DialogDescription id="issue-modal-desc">
            Report a problem tied to a project, and optionally a site.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="issue-project">Project</Label>
            <Select value={projectId} onValueChange={setProjectId} disabled={isSubmitting || projectsLoading}>
              <SelectTrigger id="issue-project" className="mt-1.5" aria-required="true">
                <SelectValue placeholder={projectsLoading ? "Loading projects…" : "Select a project"} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="issue-site">Site</Label>
            <Select value={siteId} onValueChange={setSiteId} disabled={isSubmitting}>
              <SelectTrigger id="issue-site" className="mt-1.5">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="issue-title">Title</Label>
            <Input
              id="issue-title"
              placeholder="Walk-in cooler not cooling"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5"
              required
              autoFocus
              disabled={isSubmitting}
              maxLength={300}
              aria-required="true"
            />
          </div>
          <div>
            <Label htmlFor="issue-description">Description</Label>
            <Textarea
              id="issue-description"
              placeholder="Optional — what's happening, what you've tried"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 min-h-[90px]"
              disabled={isSubmitting}
              maxLength={10000}
            />
          </div>
          <div>
            <Label htmlFor="issue-severity">Severity</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as IssueSeverity)} disabled={isSubmitting}>
              <SelectTrigger id="issue-severity" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "Creating…" : "Create issue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
