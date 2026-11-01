"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/context/tenant-context";
import { fetchIssue, updateIssue, type UpdateIssuePayload } from "@/services/api/issues.api";
import { fetchProject } from "@/services/api/projects.api";
import { fetchSite } from "@/services/api/sites.api";
import { fetchOrgMembers } from "@/services/api/members.api";
import { parseApiError } from "@/services/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { IssueSeverity, IssueStatus } from "@/types/api";
import {
  ISSUE_SEVERITY_LABEL,
  ISSUE_SEVERITY_BADGE_CLASS,
  ISSUE_STATUS_LABEL,
  ISSUE_STATUS_BADGE_CLASS,
} from "@/lib/issue-badges";
import { ArrowLeft, FolderKanban, MapPin, User } from "lucide-react";

const SEVERITIES: IssueSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUSES: IssueStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function IssueDetailPage() {
  const params = useParams<{ id: string }>();
  const issueId = params.id;
  const router = useRouter();
  const { orgId } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: issue, isLoading } = useQuery({
    queryKey: ["issue", issueId],
    queryFn: () => fetchIssue(issueId),
    enabled: !!issueId,
  });

  const { data: project } = useQuery({
    queryKey: ["project", issue?.projectId ?? ""],
    queryFn: () => fetchProject(issue!.projectId),
    enabled: !!issue?.projectId,
  });

  const { data: site } = useQuery({
    queryKey: ["site", issue?.siteId ?? ""],
    queryFn: () => fetchSite(issue!.siteId!),
    enabled: !!issue?.siteId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["org-members", orgId ?? ""],
    queryFn: () => fetchOrgMembers(orgId!),
    enabled: !!orgId,
  });

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [severity, setSeverity] = React.useState<IssueSeverity>("MEDIUM");
  const [status, setStatus] = React.useState<IssueStatus>("OPEN");
  const [assigneeId, setAssigneeId] = React.useState("unassigned");
  const [resolutionNote, setResolutionNote] = React.useState("");

  React.useEffect(() => {
    if (!issue) return;
    setTitle(issue.title);
    setDescription(issue.description ?? "");
    setSeverity(issue.severity);
    setStatus(issue.status);
    setAssigneeId(issue.assigneeId ?? "unassigned");
    setResolutionNote(issue.resolutionNote ?? "");
  }, [issue]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateIssuePayload) => updateIssue(issueId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue", issueId] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      toast({ title: "Issue updated", variant: "success" });
    },
    onError: (err) => {
      toast({ title: "Failed to update issue", description: parseApiError(err), variant: "error" });
    },
  });

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    updateMutation.mutate({
      title: trimmedTitle,
      description: description.trim(),
      severity,
      status,
      assigneeId: assigneeId === "unassigned" ? "" : assigneeId,
      resolutionNote: resolutionNote.trim(),
    });
  };

  const assignee = members.find((m) => m.userId === issue?.assigneeId);
  const raisedByMember = members.find((m) => m.userId === issue?.raisedBy);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-slide-up">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="space-y-4 animate-slide-up">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/issues")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to issues
        </Button>
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center text-muted-foreground">
            Issue not found, or you don&apos;t have access to it.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard/issues"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to issues
        </Link>
        <div className="flex items-center gap-2">
          <Badge className={ISSUE_SEVERITY_BADGE_CLASS[issue.severity]}>
            {ISSUE_SEVERITY_LABEL[issue.severity]}
          </Badge>
          <Badge className={ISSUE_STATUS_BADGE_CLASS[issue.status]}>
            {ISSUE_STATUS_LABEL[issue.status]}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="issue-detail-title">Title</Label>
              <Input
                id="issue-detail-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5"
                maxLength={300}
              />
            </div>
            <div>
              <Label htmlFor="issue-detail-description">Description</Label>
              <Textarea
                id="issue-detail-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1.5 min-h-[120px]"
                maxLength={10000}
                placeholder="No description"
              />
            </div>
            <div>
              <Label htmlFor="issue-detail-resolution">Resolution note</Label>
              <Textarea
                id="issue-detail-resolution"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                className="mt-1.5 min-h-[80px]"
                maxLength={10000}
                placeholder="Notes on how this was resolved"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="issue-detail-status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as IssueStatus)}>
                  <SelectTrigger id="issue-detail-status" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {ISSUE_STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="issue-detail-severity">Severity</Label>
                <Select value={severity} onValueChange={(v) => setSeverity(v as IssueSeverity)}>
                  <SelectTrigger id="issue-detail-severity" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {ISSUE_SEVERITY_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="issue-detail-assignee">Assignee</Label>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger id="issue-detail-assignee" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.user?.fullName ?? m.user?.email ?? m.userId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={handleSave}
                disabled={updateMutation.isPending || !title.trim()}
              >
                {updateMutation.isPending ? "Saving…" : "Save changes"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FolderKanban className="h-4 w-4 shrink-0" />
                <span className="truncate">{project?.name ?? "—"}</span>
              </div>
              {site && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{site.name}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  Raised by {raisedByMember?.user?.fullName ?? raisedByMember?.user?.email ?? "—"}
                </span>
              </div>
              {assignee && (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={assignee.user?.avatarUrl} />
                    <AvatarFallback className="text-[10px]">
                      {(assignee.user?.fullName ?? assignee.user?.email ?? "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-muted-foreground">
                    Assigned to {assignee.user?.fullName ?? assignee.user?.email}
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Created {new Date(issue.createdAt).toLocaleString()}
              </p>
              {issue.resolvedAt && (
                <p className="text-xs text-muted-foreground">
                  Resolved {new Date(issue.resolvedAt).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
