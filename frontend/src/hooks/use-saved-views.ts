"use client";

import { useState, useCallback, useEffect } from "react";
import type { BoardFilters } from "@/components/kanban/kanban-board";
import { generateClientId } from "@/lib/generate-client-id";

export interface SavedView {
  id: string;
  name: string;
  filters: BoardFilters;
  createdAt: string;
}

const STORAGE_KEY = "mini_tm_saved_views";

function loadViews(projectId: string): SavedView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${projectId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistViews(projectId: string, views: SavedView[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${STORAGE_KEY}_${projectId}`, JSON.stringify(views));
}

export function useSavedViews(projectId: string) {
  const [views, setViews] = useState<SavedView[]>([]);

  useEffect(() => {
    setViews(loadViews(projectId));
  }, [projectId]);

  const saveView = useCallback(
    (name: string, filters: BoardFilters) => {
      const newView: SavedView = {
        id: generateClientId(),
        name,
        filters: { ...filters },
        createdAt: new Date().toISOString(),
      };
      const updated = [...views, newView];
      setViews(updated);
      persistViews(projectId, updated);
      return newView;
    },
    [projectId, views]
  );

  const deleteView = useCallback(
    (viewId: string) => {
      const updated = views.filter((v) => v.id !== viewId);
      setViews(updated);
      persistViews(projectId, updated);
    },
    [projectId, views]
  );

  return { savedViews: views, saveView, deleteView };
}
