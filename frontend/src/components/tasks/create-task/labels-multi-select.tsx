"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Above create-task modal overlay (z-[100]). */
const DROPDOWN_Z = "z-[110]";

export interface TaskLabelDraft {
  name: string;
  color: string;
}

const LABEL_COLORS = [
  "#2563EB",
  "#16A34A",
  "#DC2626",
  "#7C3AED",
  "#EA580C",
  "#0891B2",
  "#E11D48",
  "#4B5563",
];

interface LabelsMultiSelectProps {
  value: TaskLabelDraft[];
  onChange: (labels: TaskLabelDraft[]) => void;
  disabled?: boolean;
}

export function LabelsMultiSelect({ value, onChange, disabled }: LabelsMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(LABEL_COLORS[0]);

  const normalized = useMemo(() => name.trim(), [name]);

  function addLabel() {
    const label = normalized;
    if (!label) return;
    if (value.some((l) => l.name.toLowerCase() === label.toLowerCase())) return;
    onChange([...value, { name: label, color }]);
    setName("");
    setOpen(false);
  }

  function removeLabel(labelName: string) {
    onChange(value.filter((l) => l.name !== labelName));
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Tag className="h-3.5 w-3.5" /> Labels
      </label>

      <div className="flex flex-wrap items-center gap-2">
        {value.map((label) => (
          <Badge
            key={label.name}
            variant="secondary"
            className="h-7 rounded-full border px-2.5 text-xs font-medium"
            style={{
              borderColor: `${label.color}55`,
              backgroundColor: `${label.color}1A`,
              color: label.color,
            }}
          >
            {label.name}
            <button
              type="button"
              className="ml-1 rounded p-0.5 hover:bg-black/10"
              onClick={() => removeLabel(label.name)}
              disabled={disabled}
              aria-label={`Remove ${label.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" disabled={disabled} className="h-7">
              <Plus className="mr-1 h-3.5 w-3.5" /> Add label
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className={cn("w-72 p-3", DROPDOWN_Z)}
            sideOffset={8}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <DropdownMenuLabel className="px-0 pt-0 text-xs font-semibold">
              New Label
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="space-y-3 pt-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Label name"
                className="h-9 text-xs"
              />
              <div className="flex flex-wrap gap-2">
                {LABEL_COLORS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setColor(hex)}
                    className="h-6 w-6 rounded-full border-2"
                    style={{
                      backgroundColor: hex,
                      borderColor: color === hex ? "#111827" : "transparent",
                    }}
                    aria-label={`Pick color ${hex}`}
                  />
                ))}
              </div>
              <Button type="button" className="h-8 w-full text-xs" onClick={addLabel}>
                Add label
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

