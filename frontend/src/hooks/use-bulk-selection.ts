"use client";

import { useState, useCallback, useMemo } from "react";

export interface BulkSelectionState {
  selectedIds: Set<string>;
  isSelectionMode: boolean;
  count: number;
}

export function useBulkSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const state: BulkSelectionState = useMemo(() => ({
    selectedIds,
    isSelectionMode,
    count: selectedIds.size,
  }), [selectedIds, isSelectionMode]);

  return {
    state,
    toggle,
    selectAll,
    deselectAll,
    isSelected,
    enterSelectionMode,
    exitSelectionMode,
  };
}
