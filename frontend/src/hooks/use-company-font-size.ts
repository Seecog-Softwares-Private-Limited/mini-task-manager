"use client";

import { useState, useEffect, useCallback } from "react";

export type FontSizeOption = "xs" | "sm" | "md" | "lg" | "xl";

export const FONT_SIZE_OPTIONS: { value: FontSizeOption; label: string; px: string; tailwind: string }[] = [
  { value: "xs", label: "XS",  px: "10px", tailwind: "text-[10px]" },
  { value: "sm", label: "SM",  px: "12px", tailwind: "text-xs"     },
  { value: "md", label: "MD",  px: "14px", tailwind: "text-sm"     },
  { value: "lg", label: "LG",  px: "16px", tailwind: "text-base"   },
  { value: "xl", label: "XL",  px: "18px", tailwind: "text-lg"     },
];

function storageKey(orgId: string) {
  return `company_brand_font_size_${orgId}`;
}

export function useCompanyFontSize(orgId: string | null | undefined) {
  const [fontSize, setFontSizeState] = useState<FontSizeOption>("md");

  useEffect(() => {
    if (!orgId) return;
    const stored = localStorage.getItem(storageKey(orgId));
    if (stored && FONT_SIZE_OPTIONS.some((o) => o.value === stored)) {
      setFontSizeState(stored as FontSizeOption);
    }
  }, [orgId]);

  const setFontSize = useCallback(
    (size: FontSizeOption) => {
      setFontSizeState(size);
      if (orgId) localStorage.setItem(storageKey(orgId), size);
    },
    [orgId]
  );

  const option = FONT_SIZE_OPTIONS.find((o) => o.value === fontSize) ?? FONT_SIZE_OPTIONS[2];

  return { fontSize, option, setFontSize };
}
