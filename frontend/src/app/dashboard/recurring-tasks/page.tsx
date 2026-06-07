"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteRecurringSeries,
  fetchRecurringSummary,
  fetchRecurringTemplateHistory,
  fetchRecurringTemplates,
  pauseRecurringTemplate,
  resumeRecurringTemplate,
  skipNextRecurringOccurrence,
  updateRecurringTemplate,
} from "@/services/api/recurring-tasks.api";
import { useTenant } from "@/context/tenant-context";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseApiError } from "@/services/api/client";
import { CalendarClock, PauseCircle, PlayCircle, Repeat, SkipForward, Trash2 } from "lucide-react";
import type { RecurringTemplateSummary, TaskRecurrenceConfig } from "@/types/api";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { RecurrenceEditor } from "@/components/tasks/recurrence/recurrence-editor";
import { recurrenceSummary } from "@/lib/recurrence-display";

const TABS = [
  { id: "UPCOMING", label: "Upcoming" },
  { id: "OVERDUE", label: "Overdue" },
  { id: "TEMPLATES", label: "Templates" },
  { id: "COMPLETED_HISTORY", label: "Completed History" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isOverdue(nextDueDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextDueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

export default function RecurringTasksPage() {
  const { orgId } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = React.useState<TabId>("UPCOMING");
  const [expandedTemplateId, setExpandedTemplateId] = React.useState<string | null>(null);
  const [editTemplate, setEditTemplate] = React.useState<RecurringTemplateSummary | null>(null);
  const [editRecurrence, setEditRecurrence] = React.useState<TaskRecurrenceConfig>({
    repeat: "NONE",
  });

  const summaryQuery = useQuery({
    queryKey: ["recurring-summary", orgId ?? ""],
    queryFn: () => fetchRecurringSummary(),
    enabled: Boolean(orgId),
  });

  const templatesQuery = useQuery({
    queryKey: ["recurring-templates", orgId ?? "", tab],
    queryFn: () => fetchRecurringTemplates({ tab }),
    enabled: Boolean(orgId),
  });

  const historyQuery = useQuery({
    queryKey: ["recurring-template-history", expandedTemplateId ?? ""],
    queryFn: () => fetchRecurringTemplateHistory(expandedTemplateId!),
    enabled: Boolean(expandedTemplateId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["recurring-summary", orgId ?? ""] });
    queryClient.invalidateQueries({ queryKey: ["recurring-templates", orgId ?? ""] });
  };

  const makeActionMutation = (
    mutationFn: (id: string) => Promise<void>,
    successMessage: string
  ) =>
    useMutation({
      mutationFn,
      onSuccess: () => {
        invalidate();
        toast({ title: successMessage, variant: "success" });
      },
      onError: (err) =>
        toast({ title: "Action failed", description: parseApiError(err), variant: "error" }),
    });

  const pauseMutation = makeActionMutation(pauseRecurringTemplate, "Recurring task paused");
  const resumeMutation = makeActionMutation(resumeRecurringTemplate, "Recurring task resumed");
  const skipMutation = makeActionMutation(skipNextRecurringOccurrence, "Next occurrence skipped");
  const deleteMutation = makeActionMutation(deleteRecurringSeries, "Recurring series deleted");
  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; recurrence: TaskRecurrenceConfig }) =>
      updateRecurringTemplate(payload.id, { recurrence: payload.recurrence }),
    onSuccess: () => {
      invalidate();
      setEditTemplate(null);
      toast({ title: "Recurrence updated", variant: "success" });
    },
    onError: (err) =>
      toast({ title: "Update failed", description: parseApiError(err), variant: "error" }),
  });

  const templates = templatesQuery.data ?? [];

  const filtered: RecurringTemplateSummary[] = React.useMemo(() => {
    if (tab === "TEMPLATES") return templates;
    if (tab === "OVERDUE") return templates.filter((t) => isOverdue(String(t.nextDueDate)));
    if (tab === "COMPLETED_HISTORY") return templates.filter((t) => t.completed > 0);
    return templates.filter((t) => !isOverdue(String(t.nextDueDate)));
  }, [tab, templates]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Recurring Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage recurring templates and generated task history across weekly, monthly, and yearly cycles.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total recurring tasks</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summaryQuery.data?.totalRecurringTasks ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Due this week</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summaryQuery.data?.dueThisWeek ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-destructive">{summaryQuery.data?.overdue ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Completed this month</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summaryQuery.data?.completedThisMonth ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Paused</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summaryQuery.data?.paused ?? 0}</CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={tab === item.id ? "default" : "outline"}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {templatesQuery.isLoading ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">Loading recurring tasks…</CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              No recurring tasks in this tab yet.
            </CardContent>
          </Card>
        ) : (
          filtered.map((item) => (
            <Card key={item.id} className="border-primary/10">
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{item.title}</h3>
                      <Badge variant="secondary" className="gap-1">
                        <Repeat className="h-3 w-3" />
                        {item.repeatType}
                      </Badge>
                      {item.isPaused ? <Badge variant="outline">Paused</Badge> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Next due: {String(item.nextDueDate).slice(0, 10)} • Completed: {item.completed} • Upcoming: {item.upcoming}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setExpandedTemplateId((prev) => (prev === item.id ? null : item.id))
                      }
                    >
                      <CalendarClock className="mr-1 h-3.5 w-3.5" />
                      View history
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditTemplate(item);
                        setEditRecurrence({ repeat: item.repeatType, createDaysBeforeDue: item.createDaysBeforeDue });
                      }}
                    >
                      Edit recurrence
                    </Button>
                    {item.isPaused ? (
                      <Button size="sm" variant="outline" onClick={() => resumeMutation.mutate(item.id)}>
                        <PlayCircle className="mr-1 h-3.5 w-3.5" />
                        Resume
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => pauseMutation.mutate(item.id)}>
                        <PauseCircle className="mr-1 h-3.5 w-3.5" />
                        Pause
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => skipMutation.mutate(item.id)}>
                      <SkipForward className="mr-1 h-3.5 w-3.5" />
                      Skip next occurrence
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(item.id)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Delete series
                    </Button>
                  </div>
                </div>

                {expandedTemplateId === item.id ? (
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    {historyQuery.isLoading ? (
                      <p className="text-xs text-muted-foreground">Loading history…</p>
                    ) : (
                      <div className="space-y-1.5 text-xs">
                        {(historyQuery.data ?? []).slice(0, 8).map((h) => (
                          <div key={h.id} className="flex items-center justify-between rounded-md bg-background px-2 py-1.5">
                            <span>#{h.sequenceNumber}</span>
                            <span>{String(h.dueDate).slice(0, 10)}</span>
                            <Badge variant={h.state === "COMPLETED" ? "default" : "secondary"}>{h.state}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={Boolean(editTemplate)} onOpenChange={(open) => !open && setEditTemplate(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <h3 className="text-base font-semibold">Edit recurrence</h3>
          </DialogHeader>
          <div className="space-y-3">
            <RecurrenceEditor
              value={editRecurrence}
              onChange={(next) => setEditRecurrence(next ?? { repeat: "NONE" })}
              disabled={updateMutation.isPending}
            />
            {editRecurrence?.repeat && editRecurrence.repeat !== "NONE" ? (
              <p className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-primary">
                {recurrenceSummary(editRecurrence) ?? "Series rule updated"}
              </p>
            ) : null}
            <Button
              className="w-full"
              disabled={!editTemplate || updateMutation.isPending}
              onClick={() =>
                editTemplate &&
                updateMutation.mutate({
                  id: editTemplate.id,
                  recurrence: editRecurrence,
                })
              }
            >
              Save recurrence
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

