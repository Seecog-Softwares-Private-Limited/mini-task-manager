"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { WorkflowStatus } from "@/types/api";
import { Settings, GripVertical, Hash } from "lucide-react";

export interface BoardSettings {
  wipLimits: Record<string, number>;
}

interface BoardSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statuses: WorkflowStatus[];
  settings: BoardSettings;
  onSettingsChange: (settings: BoardSettings) => void;
}

const STATUS_COLORS = [
  "bg-blue-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-red-500",
  "bg-cyan-500",
];

export function BoardSettingsModal({
  open,
  onOpenChange,
  statuses,
  settings,
  onSettingsChange,
}: BoardSettingsModalProps) {
  const [localWipLimits, setLocalWipLimits] = useState<Record<string, number>>(settings.wipLimits);

  useEffect(() => {
    if (open) setLocalWipLimits(settings.wipLimits);
  }, [open, settings.wipLimits]);

  function handleSave() {
    onSettingsChange({ wipLimits: localWipLimits });
    onOpenChange(false);
  }

  function updateWipLimit(statusId: string, value: string) {
    const num = parseInt(value, 10);
    setLocalWipLimits((prev) => {
      const next = { ...prev };
      if (isNaN(num) || num <= 0) {
        delete next[statusId];
      } else {
        next[statusId] = num;
      }
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Board Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* WIP Limits */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-semibold">Work-in-Progress Limits</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set maximum task count per column. Leave empty for unlimited.
              </p>
            </div>
            <div className="space-y-2">
              {statuses.map((status, index) => (
                <div
                  key={status.id}
                  className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                  <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", STATUS_COLORS[index % STATUS_COLORS.length])} />
                  <span className="text-sm font-medium flex-1 truncate">{status.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Hash className="h-3 w-3 text-muted-foreground/50" />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="—"
                      value={localWipLimits[status.id] ?? ""}
                      onChange={(e) => updateWipLimit(status.id, e.target.value)}
                      className="h-8 w-16 text-center text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column info */}
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Tip:</strong> WIP limits help your team focus on finishing work before starting new tasks.
              The column count badge turns red when the limit is exceeded.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
