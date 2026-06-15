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
import { CREATE_FIELD_LABEL } from "@/components/tasks/create-task/form-section";

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

const SUGGESTED_LABELS: TaskLabelDraft[] = [
  { name: "bug", color: "#DC2626" },
  { name: "frontend", color: "#2563EB" },
  { name: "backend", color: "#0891B2" },
  { name: "urgent", color: "#EA580C" },
  { name: "release", color: "#7C3AED" },
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

  const availableSuggestions = useMemo(
    () =>
      SUGGESTED_LABELS.filter(
        (s) => !value.some((l) => l.name.toLowerCase() === s.name.toLowerCase())
      ),
    [value]
  );

  function addLabel(label: TaskLabelDraft) {
    if (!label.name.trim()) return;
    if (value.some((l) => l.name.toLowerCase() === label.name.toLowerCase())) return;
    onChange([...value, label]);
    setName("");
    setOpen(false);
  }

  function removeLabel(labelName: string) {
    onChange(value.filter((l) => l.name !== labelName));
  }

  return (
    <div className="space-y-2.5">
      <label className={cn(CREATE_FIELD_LABEL, "flex items-center gap-1.5")}>
        <Tag className="h-3.5 w-3.5" /> Labels
      </label>

      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((label) => (
          <Badge
            key={label.name}
            variant="secondary"
            className="h-6 gap-0.5 rounded-md border px-2 text-[11px] font-medium transition-all duration-200"
            style={{
              borderColor: `${label.color}44`,
              backgroundColor: `${label.color}14`,
              color: label.color,
            }}
          >
            {label.name}
            <button
              type="button"
              className="ml-0.5 rounded p-0.5 opacity-70 transition-opacity duration-200 hover:opacity-100"
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className="h-6 rounded-md border-dashed px-2 text-[11px] transition-all duration-200"
            >
              <Plus className="mr-1 h-3 w-3" /> Add label
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
              New label
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
                    className="h-6 w-6 rounded-full border-2 transition-transform duration-200 hover:scale-105"
                    style={{
                      backgroundColor: hex,
                      borderColor: color === hex ? "#111827" : "transparent",
                    }}
                    aria-label={`Pick color ${hex}`}
                  />
                ))}
              </div>
              <Button
                type="button"
                className="h-8 w-full text-xs"
                onClick={() => addLabel({ name: normalized, color })}
                disabled={!normalized}
              >
                Add label
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {availableSuggestions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Suggested</span>
          {availableSuggestions.map((suggestion) => (
            <button
              key={suggestion.name}
              type="button"
              disabled={disabled}
              onClick={() => addLabel(suggestion)}
              className="inline-flex h-6 items-center rounded-md border px-2 text-[11px] font-medium transition-all duration-200 hover:brightness-[0.98]"
              style={{
                borderColor: `${suggestion.color}44`,
                backgroundColor: `${suggestion.color}10`,
                color: suggestion.color,
              }}
            >
              {suggestion.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
