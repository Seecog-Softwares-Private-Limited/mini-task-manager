"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/context/tenant-context";
import { fetchIssues, createIssue, type CreateIssuePayload } from "@/services/api/issues.api";
import { fetchProjects } from "@/services/api/projects.api";
import { fetchSites } from "@/services/api/sites.api";
import { parseApiError } from "@/services/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IssueCreateModal } from "@/components/issues/issue-create-modal";
import type { IssueStatus } from "@/types/api";
import {
  ISSUE_SEVERITY_LABEL,
  ISSUE_SEVERITY_BADGE_CLASS,
  ISSUE_STATUS_LABEL,
  ISSUE_STATUS_BADGE_CLASS,
} from "@/lib/issue-badges";
import { AlertTriangle, Plus, MapPin } from "lucide-react";

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

export default function IssuesPage() {
  const { orgId } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [projectFilter, setProjectFilter] = React.useState("all");
  const [createOpen, setCreateOpen] = React.useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    enabled: !!orgId,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites", orgId ?? ""],
    queryFn: fetchSites,
    enabled: !!orgId,
  });

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ["issues", orgId ?? "", statusFilter, projectFilter],
    queryFn: () =>
      fetchIssues({
        status: statusFilter === "all" ? undefined : (statusFilter as IssueStatus),
        projectId: projectFilter === "all" ? undefined : projectFilter,
      }),
    enabled: !!orgId,
  });

  const projectName = React.useCallback(
    (id: string) => projects.find((p) => p.id === id)?.name ?? "—",
    [projects]
  );
  const siteName = React.useCallback(
    (id?: string | null) => (id ? sites.find((s) => s.id === id)?.name : undefined),
    [sites]
  );

  const createMutation = useMutation({
    mutationFn: (payload: CreateIssuePayload) => createIssue(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues", orgId ?? ""] });
      setCreateOpen(false);
      toast({ title: "Issue created", variant: "success" });
    },
    onError: (err) => {
      toast({ title: "Failed to create issue", description: parseApiError(err), variant: "error" });
    },
  });

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Issues</h1>
          <p className="mt-1 text-muted-foreground">
            Problems raised against projects, tasks or sites — track them through to resolution.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" /> New issue
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[170px]" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full sm:w-[200px]" aria-label="Filter by project">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : issues.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center text-muted-foreground">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <AlertTriangle className="h-6 w-6 text-primary" />
              </div>
              <p>
                {statusFilter !== "all" || projectFilter !== "all"
                  ? "No issues match these filters."
                  : "No issues yet — raise one to start tracking it."}
              </p>
            </div>
          ) : (
            <ul className="divide-y" role="list">
              {issues.map((issue) => (
                <li key={issue.id}>
                  <Link
                    href={`/dashboard/issues/${issue.id}`}
                    className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{issue.title}</p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {projectName(issue.projectId)}
                        {siteName(issue.siteId) ? (
                          <span className="inline-flex items-center gap-1">
                            {" "}
                            · <MapPin className="h-3 w-3" /> {siteName(issue.siteId)}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <Badge className={ISSUE_SEVERITY_BADGE_CLASS[issue.severity]}>
                      {ISSUE_SEVERITY_LABEL[issue.severity]}
                    </Badge>
                    <Badge className={ISSUE_STATUS_BADGE_CLASS[issue.status]}>
                      {ISSUE_STATUS_LABEL[issue.status]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <IssueCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(payload) => createMutation.mutate(payload)}
        isSubmitting={createMutation.isPending}
        error={createMutation.error ? parseApiError(createMutation.error) : null}
      />
    </div>
  );
}
