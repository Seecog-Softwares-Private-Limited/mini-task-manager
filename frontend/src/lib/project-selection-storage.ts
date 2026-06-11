/**
 * Persisted project selection per workspace (organization).
 * Keyed by org id so switching workspaces restores each workspace's last project.
 */

const KEY = "mini_tm_project_by_org";

type ProjectByOrg = Record<string, string>;

function readAll(): ProjectByOrg {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProjectByOrg;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map: ProjectByOrg): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function getStoredProjectId(orgId: string | null): string | null {
  if (!orgId) return null;
  return readAll()[orgId] ?? null;
}

export function setStoredProjectId(orgId: string, projectId: string): void {
  const map = readAll();
  map[orgId] = projectId;
  writeAll(map);
}

export function clearStoredProjectId(orgId: string): void {
  const map = readAll();
  delete map[orgId];
  writeAll(map);
}
