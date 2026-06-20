"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { BoardFilters } from "@/components/kanban/kanban-board";
import {
  createSavedView,
  deleteSavedView,
  fetchSavedViews,
  type SavedViewDto,
} from "@/services/api/saved-views.api";

export interface SavedView {
  id: string;
  name: string;
  filters: BoardFilters;
  createdAt: string;
  isShared?: boolean;
}

function mapDto(dto: SavedViewDto): SavedView {
  return {
    id: dto.id,
    name: dto.name,
    filters: dto.filters as BoardFilters,
    createdAt: dto.createdAt,
    isShared: dto.isShared,
  };
}

export function useSavedViews(projectId: string) {
  const queryClient = useQueryClient();
  const [localViews, setLocalViews] = useState<SavedView[]>([]);

  const { data: serverViews } = useQuery({
    queryKey: ["saved-views", projectId],
    queryFn: () => fetchSavedViews(projectId),
    enabled: Boolean(projectId) && projectId !== "__none__",
    staleTime: 30_000,
  });

  // Depend on the stable `data` reference (not a `= []` default, which is a new
  // array every render and would loop this effect → "Maximum update depth exceeded").
  useEffect(() => {
    if (serverViews) {
      setLocalViews(serverViews.map(mapDto));
    }
  }, [serverViews]);

  const saveView = useCallback(
    async (name: string, filters: BoardFilters, isShared = false) => {
      if (!projectId || projectId === "__none__") {
        throw new Error("Select a project first");
      }
      const created = await createSavedView({
        projectId,
        name,
        filters: { ...filters },
        isShared,
      });
      const mapped = mapDto(created);
      setLocalViews((prev) => [...prev, mapped]);
      queryClient.invalidateQueries({ queryKey: ["saved-views", projectId] });
      return mapped;
    },
    [projectId, queryClient]
  );

  const deleteView = useCallback(
    async (viewId: string) => {
      await deleteSavedView(viewId);
      setLocalViews((prev) => prev.filter((v) => v.id !== viewId));
      queryClient.invalidateQueries({ queryKey: ["saved-views", projectId] });
    },
    [projectId, queryClient]
  );

  return { savedViews: localViews, saveView, deleteView };
}
