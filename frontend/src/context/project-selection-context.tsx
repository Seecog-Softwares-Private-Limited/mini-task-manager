"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getStoredProjectId,
  setStoredProjectId,
  clearStoredProjectId,
} from "@/lib/project-selection-storage";
import { useTenant } from "@/context/tenant-context";

type ProjectSelectionContextValue = {
  selectedProjectId: string | null;
  setSelectedProjectId: (projectId: string | null) => void;
  ready: boolean;
};

const ProjectSelectionContext = createContext<ProjectSelectionContextValue | null>(null);

export function ProjectSelectionProvider({ children }: { children: ReactNode }) {
  const { orgId, ready: tenantReady } = useTenant();
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!tenantReady) return;
    if (!orgId) {
      setSelectedProjectIdState(null);
      setReady(true);
      return;
    }
    setSelectedProjectIdState(getStoredProjectId(orgId));
    setReady(true);
  }, [orgId, tenantReady]);

  const setSelectedProjectId = useCallback(
    (projectId: string | null) => {
      if (!orgId) return;
      if (projectId) {
        setStoredProjectId(orgId, projectId);
        setSelectedProjectIdState(projectId);
      } else {
        clearStoredProjectId(orgId);
        setSelectedProjectIdState(null);
      }
    },
    [orgId]
  );

  return (
    <ProjectSelectionContext.Provider value={{ selectedProjectId, setSelectedProjectId, ready }}>
      {children}
    </ProjectSelectionContext.Provider>
  );
}

export function useProjectSelection() {
  const ctx = useContext(ProjectSelectionContext);
  if (!ctx) {
    throw new Error("useProjectSelection must be used within ProjectSelectionProvider");
  }
  return ctx;
}

export function useProjectSelectionOptional() {
  return useContext(ProjectSelectionContext);
}
