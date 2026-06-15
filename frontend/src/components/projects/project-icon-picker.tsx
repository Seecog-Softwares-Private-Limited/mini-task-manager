"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Check, ChevronLeft, ChevronRight, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
const RECOMMENDED_COUNT = 12;

function IconTile({
  dataUrl,
  selected,
  disabled,
  onSelect,
  title,
}: {
  dataUrl: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "group relative aspect-square overflow-hidden rounded-md border-2 transition-all duration-200",
        selected
          ? "border-violet-600 shadow-[0_0_0_3px_rgba(124,58,237,0.14),0_2px_8px_-2px_rgba(124,58,237,0.25)] dark:border-violet-500 dark:shadow-[0_0_0_3px_rgba(139,92,246,0.12),0_2px_8px_-2px_rgba(139,92,246,0.2)]"
          : "border-transparent hover:border-violet-400/40 hover:shadow-sm"
      )}
      title={title}
      aria-label={`Select ${title}`}
      aria-pressed={selected}
    >
      <img src={dataUrl} alt="" className="h-full w-full object-cover" />
      {selected && (
        <span className="absolute inset-0 flex items-center justify-center bg-violet-950/12 dark:bg-violet-950/20">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-white shadow-sm dark:bg-violet-500">
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
        </span>
      )}
    </button>
  );
}

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
  const [showFullLibrary, setShowFullLibrary] = useState(false);
  const presets = useMemo(() => getProjectIconPresets(), []);

  const recommended = useMemo(() => presets.slice(0, RECOMMENDED_COUNT), [presets]);

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

  useEffect(() => {
    if (!showFullLibrary) {
      setFilter("");
      setPage(0);
    }
  }, [showFullLibrary]);

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

  const selectedInRecommended = value
    ? recommended.some((p) => p.dataUrl === value)
    : false;

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center gap-2.5 rounded-lg border border-border/45 bg-muted/10 px-2.5 py-2">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/40 bg-background shadow-sm">
          {value ? (
            <>
              <img src={value} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={clear}
                disabled={disabled}
                className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-medium text-white opacity-0 transition-opacity duration-200 hover:opacity-100"
                aria-label="Remove icon"
              >
                Clear
              </button>
            </>
          ) : (
            <span className="text-[11px] font-semibold text-muted-foreground">
              {getInitials(projectNamePlaceholder) || "—"}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <label
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-medium text-foreground transition-colors duration-200 hover:text-primary",
              disabled && "pointer-events-none opacity-50"
            )}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={disabled}
              onChange={handleFile}
            />
            <ImagePlus className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            <span>{value ? "Change image" : "Upload image"}</span>
          </label>
          <p className="text-[10px] text-muted-foreground">PNG or JPG, up to 500KB</p>
        </div>
      </div>

      {!showFullLibrary ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">Recommended icons</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-muted-foreground transition-colors duration-200 hover:text-foreground"
              disabled={disabled}
              onClick={() => setShowFullLibrary(true)}
            >
              View all icons
            </Button>
          </div>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
            {recommended.map((p) => (
              <IconTile
                key={p.id}
                dataUrl={p.dataUrl}
                selected={value === p.dataUrl}
                disabled={disabled}
                onSelect={() => selectPreset(p.dataUrl)}
                title={p.id}
              />
            ))}
          </div>
          {value && !selectedInRecommended && (
            <p className="text-[10px] text-muted-foreground">
              Custom icon selected from the full library or upload.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                Icon library ({PROJECT_ICON_PRESET_COUNT})
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] transition-colors duration-200"
                disabled={disabled}
                onClick={() => setShowFullLibrary(false)}
              >
                Show recommended
              </Button>
            </div>
            <Input
              type="search"
              placeholder="Jump to # (e.g. 240) or filter id…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-7 max-w-xs text-xs transition-colors duration-200"
              disabled={disabled}
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>
              Page {safePage + 1} / {totalPages}
              {filter ? ` · ${filtered.length} match` : ""}
            </span>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-6 w-6 transition-colors duration-200"
                disabled={disabled || safePage <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                aria-label="Previous icons page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-6 w-6 transition-colors duration-200"
                disabled={disabled || safePage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                aria-label="Next icons page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="max-h-36 overflow-y-auto rounded-lg border border-border/45 bg-muted/10 p-1.5">
            <div className="grid grid-cols-8 gap-1.5">
              {pageItems.map((p) => (
                <IconTile
                  key={p.id}
                  dataUrl={p.dataUrl}
                  selected={value === p.dataUrl}
                  disabled={disabled}
                  onSelect={() => selectPreset(p.dataUrl)}
                  title={p.id}
                />
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">No matches.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
