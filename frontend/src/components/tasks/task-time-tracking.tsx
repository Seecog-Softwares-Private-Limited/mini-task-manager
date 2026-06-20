"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchTimeEntries, logTaskTime } from "@/services/api/time-tracking.api";
import { usePlan } from "@/context/plan-context";

interface TaskTimeTrackingProps {
  taskId: string;
  loggedMinutes?: number;
  readOnly?: boolean;
}

export function TaskTimeTracking({ taskId, loggedMinutes = 0, readOnly }: TaskTimeTrackingProps) {
  const { plan } = usePlan();
  const timeTrackingEnabled = plan?.timeTracking ?? false;
  const [minutes, setMinutes] = useState("30");
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();

  const { data: entries = [] } = useQuery({
    queryKey: ["time-entries", taskId],
    queryFn: () => fetchTimeEntries(taskId),
    enabled: Boolean(taskId) && timeTrackingEnabled,
    retry: false,
  });

  const logMutation = useMutation({
    mutationFn: () => logTaskTime(taskId, { minutes: Number(minutes), note: note || undefined }),
    onSuccess: () => {
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["time-entries", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  if (!timeTrackingEnabled) return null;

  return (
    <div className="space-y-2 rounded-lg border border-border/60 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        Time tracked
        <span className="ml-auto normal-case font-medium text-foreground">{loggedMinutes} min total</span>
      </div>
      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <Input
            type="number"
            min={1}
            className="h-8 w-20 text-sm"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="Min"
          />
          <Input
            className="h-8 flex-1 min-w-[120px] text-sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
          />
          <Button
            size="sm"
            className="h-8"
            disabled={logMutation.isPending || !minutes}
            onClick={() => logMutation.mutate()}
          >
            Log time
          </Button>
        </div>
      )}
      {entries.length > 0 && (
        <ul className="max-h-24 space-y-1 overflow-y-auto text-xs text-muted-foreground">
          {entries.slice(0, 5).map((e) => (
            <li key={e.id}>
              {e.minutes} min — {new Date(e.loggedAt).toLocaleString()}
              {e.note ? ` — ${e.note}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
