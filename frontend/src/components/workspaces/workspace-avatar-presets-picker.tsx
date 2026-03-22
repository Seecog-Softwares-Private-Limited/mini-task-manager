"use client";

import { cn } from "@/lib/utils";
import { WORKSPACE_AVATAR_PRESETS, findPresetByDataUrl } from "@/lib/workspace-avatar-presets";

export interface WorkspaceAvatarPresetsPickerProps {
  /** Current logo value (preset data URL or uploaded data URL) */
  value: string | null;
  onSelectPreset: (dataUrl: string) => void;
  className?: string;
}

/**
 * Grid of preset workspace avatars (SVG data URLs). Upload is handled separately by parent.
 */
export function WorkspaceAvatarPresetsPicker({
  value,
  onSelectPreset,
  className,
}: WorkspaceAvatarPresetsPickerProps) {
  const selectedPreset = findPresetByDataUrl(value);

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-medium text-muted-foreground">Preset icons</p>
      <div
        className="grid grid-cols-6 gap-2 sm:grid-cols-6"
        role="list"
        aria-label="Workspace icon presets"
      >
        {WORKSPACE_AVATAR_PRESETS.map((preset) => {
          const isSelected = selectedPreset?.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              role="listitem"
              onClick={() => onSelectPreset(preset.dataUrl)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-xl border-2 transition-all",
                "hover:ring-2 hover:ring-primary/30 hover:ring-offset-2 hover:ring-offset-background",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? "border-primary ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
                  : "border-transparent bg-muted/40"
              )}
              title={preset.label}
              aria-label={`Use ${preset.label} icon`}
              aria-pressed={isSelected}
            >
              <img src={preset.dataUrl} alt="" className="h-full w-full object-cover" />
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground/80">
        Pick a preset or upload your own image above.
      </p>
    </div>
  );
}
