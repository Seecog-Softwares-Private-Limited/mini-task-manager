"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchIndustries } from "@/services/api/organizations.api";
import type { IndustryKey } from "@/types/api";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface IndustryPickerProps {
  value: IndustryKey | null;
  onSelect: (key: IndustryKey) => void;
  className?: string;
}

/** Grid of industry editions (see industry-packs.ts on the backend). Same app, different words. */
export function IndustryPicker({ value, onSelect, className }: IndustryPickerProps) {
  const { data: industries = [], isLoading } = useQuery({
    queryKey: ["industries"],
    queryFn: fetchIndustries,
    staleTime: Infinity,
  });

  if (isLoading) {
    return <div className="h-20 animate-pulse rounded-xl bg-muted/40" />;
  }

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)} role="radiogroup" aria-label="Industry">
      {industries.map((ind) => {
        const isSelected = value === ind.key;
        return (
          <button
            key={ind.key}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(ind.key)}
            className={cn(
              "flex min-h-[72px] flex-col gap-0.5 rounded-xl border-2 p-3 text-left transition-all",
              "hover:ring-2 hover:ring-primary/30 hover:ring-offset-2 hover:ring-offset-background",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isSelected
                ? "border-primary bg-primary/5 ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                : "border-border/60 bg-muted/20"
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              {ind.label}
              {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
            </span>
            <span className="text-xs text-muted-foreground">{ind.description}</span>
          </button>
        );
      })}
    </div>
  );
}
