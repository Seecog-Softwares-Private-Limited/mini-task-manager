"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { ImagePlus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, getInitials } from "@/lib/utils";
import { getProjectIconPresets, PROJECT_ICON_PRESET_COUNT } from "@/lib/project-icon-presets";

export interface ProjectIconPickerProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  projectNamePlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

const MAX_FILE_BYTES = 500 * 1024;
const PAGE_SIZE = 100;

export function ProjectIconPicker({
  value,
  onChange,
  projectNamePlaceholder = "Project",
  disabled,
  className,
}: ProjectIconPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const presets = useMemo(() => getProjectIconPresets(), []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return presets;
    const num = parseInt(q.replace(/\D/g, ""), 10);
    if (!Number.isNaN(num) && num >= 0 && num < presets.length) {
      return [presets[num]];
    }
    return presets.filter((p) => p.id.includes(q) || p.id.replace("pi-", "").includes(q));
  }, [presets, filter]);

  useEffect(() => {
    setPage(0);
  }, [filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    if (file.size > MAX_FILE_BYTES) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function clear() {
    onChange(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function selectPreset(dataUrl: string) {
    onChange(dataUrl);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Project icon (optional)
      </Label>
      <div className="flex items-center gap-4">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-muted bg-muted/50">
          {value ? (
            <>
              <img src={value} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={clear}
                className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-medium text-white opacity-0 transition-opacity hover:opacity-100"
                aria-label="Remove icon"
              >
                Clear
              </button>
            </>
          ) : (
            <span className="text-sm font-semibold text-muted-foreground">
              {getInitials(projectNamePlaceholder) || "—"}
            </span>
          )}
        </div>
        <div className="flex-1 space-y-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={disabled}
              onChange={handleFile}
            />
            <ImagePlus className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <span>{value ? "Change image" : "Upload image"}</span>
          </label>
          <p className="text-xs text-muted-foreground/80">PNG, JPG up to 500KB. Or pick an avatar below.</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            Avatar library ({PROJECT_ICON_PRESET_COUNT} icons)
          </p>
          <Input
            type="search"
            placeholder="Jump to # (e.g. 240) or filter id…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 max-w-xs text-xs"
            disabled={disabled}
          />
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Page {safePage + 1} / {totalPages}
            {filter ? ` · ${filtered.length} match` : ""}
          </span>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={disabled || safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              aria-label="Previous icons page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={disabled || safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              aria-label="Next icons page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto rounded-xl border border-border/60 bg-muted/20 p-2">
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 md:grid-cols-10">
            {pageItems.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => selectPreset(p.dataUrl)}
                className={cn(
                  "aspect-square overflow-hidden rounded-lg border-2 transition-all",
                  value === p.dataUrl
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-transparent hover:border-primary/40"
                )}
                title={p.id}
                aria-label={`Select ${p.id}`}
              >
                <img src={p.dataUrl} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">No matches.</p>
          )}
        </div>
      </div>
    </div>
  );
}
