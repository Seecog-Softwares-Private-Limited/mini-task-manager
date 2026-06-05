"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProjectPermanently,
  type CreateProjectPayload,
  type UpdateProjectPayload,
} from "@/services/api/projects.api";
import { fetchOrganizations } from "@/services/api/organizations.api";
import { fetchTasksByProject } from "@/services/api/tasks.api";
import { fetchProjectMembers, fetchOrgMembers } from "@/services/api/members.api";
import { fetchWorkflowsByProject, fetchWorkflowStatuses } from "@/services/api/workflows.api";
import { parseApiError, isRateLimited } from "@/services/api/client";
import { useTenant } from "@/context/tenant-context";
import { useFeatureGate } from "@/hooks/use-feature-gate";
import { useUpgradeModalOptional } from "@/context/upgrade-modal-context";
import { useOnboardingOptional } from "@/context/onboarding-context";
import { useAnalytics } from "@/hooks/use-analytics";
import type { Organization, Project, WorkflowStatus } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectsEmptyState } from "@/components/projects/projects-empty-state";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn, type SortDirection } from "@/components/ui/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectPreviewDrawer } from "@/components/projects/project-preview-drawer";
import { ProjectRemoveDialog } from "@/components/projects/project-remove-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { stripHtmlToPlainText, truncatePlainText } from "@/lib/project-description-plain";
import { WorkspaceThumb } from "@/components/workspaces/workspace-thumb";
import {
  FolderKanban,
  Plus,
  Lock,
  ArrowRight,
  LayoutGrid as LayoutGridIcon,
  List as ListIcon,
  MoreHorizontal,
  Users,
  CheckSquare,
  CalendarClock,
  Filter,
  ChevronDown,
  Pencil,
  Settings,
  Code2,
  Megaphone,
  FileText,
  Presentation,
  FileSpreadsheet,
  SquarePen,
  Eye,
  Trash2,
} from "lucide-react";
import type { Task } from "@/types/api";

const ProjectFormDescriptionEditor = dynamic(
  () =>
    import("@/components/projects/project-form-description-editor").then(
      (mod) => mod.ProjectFormDescriptionEditor
    ),
  { ssr: false, loading: () => <Skeleton className="h-[240px] w-full rounded-xl" /> }
);

const ProjectIconPicker = dynamic(
  () => import("@/components/projects/project-icon-picker").then((mod) => mod.ProjectIconPicker),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full rounded-xl" /> }
);

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Safe icon refs to avoid undefined component (e.g. name collision in bundle)
function FallbackGridIcon({ className }: { className?: string }) {
  return <span className={className} aria-hidden>⊞</span>;
}
function FallbackListIcon({ className }: { className?: string }) {
  return <span className={className} aria-hidden>≡</span>;
}
const GridViewIcon = LayoutGridIcon ?? FallbackGridIcon;
const ListViewIcon = ListIcon ?? FallbackListIcon;

const createSchema = z.object({
  name: z.string().min(1, "Name required").max(200),
  description: z.string().max(400_000).optional(),
  visibility: z.string().optional(),
  workspaceId: z.string().min(1, "Select a workspace"),
});

type CreateFormData = z.infer<typeof createSchema>;

type ProjectTemplate = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
};

const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "software",
    name: "Software Development",
    description: "Track features, bugs, and sprints",
    icon: <Code2 className="h-5 w-5" />,
  },
  {
    id: "marketing",
    name: "Marketing Campaign",
    description: "Plan campaigns, content, and launches",
    icon: <Megaphone className="h-5 w-5" />,
  },
  {
    id: "content",
    name: "Content Management",
    description: "Manage articles, videos, and editorial",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    id: "product",
    name: "Product Launch",
    description: "Coordinate launches and releases",
    icon: <Presentation className="h-5 w-5" />,
  },
  {
    id: "operations",
    name: "Operations",
    description: "Track processes and workflows",
    icon: <FileSpreadsheet className="h-5 w-5" />,
  },
];

/**
 * Compute progress % and overdue count from tasks.
 * When doneStatusIds is provided (from workflow "Done" status), completion = task in Done column.
 * Otherwise falls back to subtask completion (all subtasks done or no subtasks).
 */
function projectProgressFromTasks(
  tasks: Task[],
  totalTasks: number,
  doneStatusIds?: string[]
): { progressPercent: number; completedCount: number; overdueCount: number } {
  const now = Date.now();
  const completedCount =
    doneStatusIds && doneStatusIds.length > 0
      ? tasks.filter((t) => t.statusId && doneStatusIds.includes(t.statusId)).length
      : tasks.filter(
          (t) => (t.subtasks?.length ?? 0) === 0 || (t.subtasks ?? []).every((s) => s.completed)
        ).length;
  const overdueCount = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate).getTime() < now
  ).length;
  const sampleSize = Math.min(tasks.length, 50);
  const progressPercent =
    totalTasks === 0 ? 0 : sampleSize === 0 ? 0 : Math.round((completedCount / Math.min(totalTasks, sampleSize)) * 100);
  return { progressPercent, completedCount, overdueCount };
}

function getDoneStatusIds(statuses: WorkflowStatus[] | undefined): string[] {
  if (!statuses?.length) return [];
  return statuses.filter((s) => s.type === "DONE").map((s) => s.id);
}

type ProjectHealth = "healthy" | "at-risk" | "critical";

/**
 * Derive project health from overdue count and progress.
 * - healthy: no overdue, progress >= 50% (or no tasks)
 * - at-risk: 1–2 overdue or progress < 50%
 * - critical: 3+ overdue or progress < 25%
 */
function projectHealthFromTasks(
  overdueCount: number,
  progressPercent: number,
  totalTasks: number
): ProjectHealth {
  if (totalTasks === 0) return "healthy";
  if (overdueCount >= 3 || progressPercent < 25) return "critical";
  if (overdueCount >= 1 || progressPercent < 50) return "at-risk";
  return "healthy";
}

function ProjectHealthDot({
  health,
  loading,
  label,
}: {
  health: ProjectHealth;
  loading?: boolean;
  label?: string;
}) {
  if (loading) {
    return (
      <span
        className="h-2 w-2 shrink-0 rounded-full bg-muted animate-pulse"
        aria-hidden
      />
    );
  }
  const dotClass = {
    healthy: "bg-[hsl(var(--success))]",
    "at-risk": "bg-[hsl(var(--warning))]",
    critical: "bg-destructive",
  }[health];
  const ariaLabel = label ?? `Project health: ${health}`;
  return (
    <span
      className={cn("h-2 w-2 shrink-0 rounded-full", dotClass)}
      role="status"
      aria-label={ariaLabel}
      title={ariaLabel}
    />
  );
}

function formatRelativeTime(input: string | undefined): string {
  if (!input) return "";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const absMs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (absMs < minute) return rtf.format(-Math.round(diffMs / 1000), "second");
  if (absMs < hour) return rtf.format(-Math.round(diffMs / minute), "minute");
  if (absMs < day) return rtf.format(-Math.round(diffMs / hour), "hour");
  if (absMs < 7 * day) return rtf.format(-Math.round(diffMs / day), "day");
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined });
}

const MS_24H = 24 * 60 * 60 * 1000;
function isUpdatedWithin24h(updatedAt: string | undefined): boolean {
  if (!updatedAt) return false;
  return Date.now() - new Date(updatedAt).getTime() < MS_24H;
}

type ProjectMember = { id: string; user?: { fullName?: string; email?: string; avatarUrl?: string } };

function getProjectColumns(
  tasksQueries: { data?: { data: Task[]; meta: { total: number } }; isLoading?: boolean }[],
  projectIds: string[],
  defaultWorkflowIds: (string | undefined)[],
  doneStatusIdsByWorkflowId: Map<string, string[]>,
  membersQueries: { data?: ProjectMember[]; isLoading?: boolean }[],
  options: {
    onRemove: (p: Project) => void;
    onPreview: (p: Project) => void;
    onEditProject: (p: Project) => void;
  }
): DataTableColumn<Project>[] {
  const { onRemove, onPreview, onEditProject } = options;
  return [
    {
      key: "name",
      header: "Name",
      sortable: true,
      filterable: true,
      render: (p) => {
        const idx = p.id.startsWith("temp-") ? -1 : projectIds.indexOf(p.id);
        const tasksData = idx >= 0 ? tasksQueries[idx]?.data : undefined;
        const loading = idx >= 0 ? tasksQueries[idx]?.isLoading : false;
        const totalTasks = tasksData?.meta?.total ?? 0;
        const tasks = tasksData?.data ?? [];
        const defaultWfId = idx >= 0 ? defaultWorkflowIds[idx] : undefined;
        const doneStatusIds = defaultWfId ? doneStatusIdsByWorkflowId.get(defaultWfId) : undefined;
        const { progressPercent, overdueCount } = projectProgressFromTasks(tasks, totalTasks, doneStatusIds);
        const health = projectHealthFromTasks(overdueCount, progressPercent, totalTasks);
        return (
          <Link href={p.id.startsWith("temp-") ? "#" : `/dashboard/projects/${p.id}`} className="flex items-center gap-2 font-semibold hover:text-primary transition-colors">
            <ProjectHealthDot health={health} loading={loading} label={`${health}: ${overdueCount} overdue, ${progressPercent}% complete`} />
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
              {p.iconUrl ? (
                <img src={p.iconUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <FolderKanban className="h-4 w-4 text-primary" />
              )}
            </div>
            {p.name}
          </Link>
        );
      },
    },
    {
      key: "description",
      header: "Description",
      sortable: false,
      render: (p) => (
        <span className="max-w-[240px] text-muted-foreground line-clamp-2">
          {truncatePlainText(stripHtmlToPlainText(p.description), 140) || "—"}
        </span>
      ),
    },
    {
      key: "members",
      header: "Members",
      sortable: false,
      render: (p) => {
        const idx = p.id.startsWith("temp-") ? -1 : projectIds.indexOf(p.id);
        const members = idx >= 0 ? membersQueries[idx]?.data ?? [] : [];
        const loading = idx >= 0 ? membersQueries[idx]?.isLoading : false;
        const displayMembers = members.slice(0, 4);
        const overflowCount = members.length > 4 ? members.length - 4 : 0;
        const memberNames = members.map((m) => m.user?.fullName ?? m.user?.email ?? "Unknown").join(", ");
        if (loading) return <span className="text-xs text-muted-foreground">…</span>;
        if (members.length === 0) {
          return (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-4 w-4" /> None
            </span>
          );
        }
        return (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <div className="flex -space-x-2">
                    {displayMembers.map((m) => (
                      <Avatar key={m.id} className="h-7 w-7 border-2 border-background ring-1 ring-border">
                        <AvatarImage src={m.user?.avatarUrl} />
                        <AvatarFallback className="text-[10px] bg-muted">
                          {(m.user?.fullName ?? m.user?.email ?? "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  {overflowCount > 0 && (
                    <span className="ml-0.5 text-xs font-medium text-muted-foreground">+{overflowCount}</span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px]">
                <p className="font-medium text-foreground">Project members</p>
                <p className="mt-1 text-muted-foreground">{memberNames}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      key: "progress",
      header: "Progress",
      sortable: false,
      render: (p) => {
        const idx = p.id.startsWith("temp-") ? -1 : projectIds.indexOf(p.id);
        const tasksData = idx >= 0 ? tasksQueries[idx]?.data : undefined;
        const loading = idx >= 0 ? tasksQueries[idx]?.isLoading : false;
        const totalTasks = tasksData?.meta?.total ?? 0;
        const tasks = tasksData?.data ?? [];
        const defaultWfId = idx >= 0 ? defaultWorkflowIds[idx] : undefined;
        const doneStatusIds = defaultWfId ? doneStatusIdsByWorkflowId.get(defaultWfId) : undefined;
        const { progressPercent, overdueCount } = projectProgressFromTasks(tasks, totalTasks, doneStatusIds);
        return (
          <div className="flex min-w-[140px] max-w-[200px] flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              {loading ? (
                <span className="text-muted-foreground">…</span>
              ) : (
                <>
                  <span className="tabular-nums text-muted-foreground">{totalTasks} tasks</span>
                  <span className="font-medium tabular-nums text-foreground">{progressPercent}%</span>
                </>
              )}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                style={{ width: loading ? "0%" : `${Math.min(100, progressPercent)}%` }}
              />
            </div>
            {!loading && overdueCount > 0 && (
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive">
                <CalendarClock className="h-3 w-3" />
                {overdueCount} overdue
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "visibility",
      header: "Visibility",
      sortable: true,
      render: (p) => (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
          {p.visibility === "PRIVATE" && <Lock className="h-3 w-3" />}
          {p.visibility}
        </span>
      ),
    },
    {
      key: "isArchived",
      header: "Status",
      sortable: true,
      render: (p) => (
        <Badge variant={p.isArchived ? "statusArchived" : "statusActive"}>
          {p.isArchived ? "Archived" : "Active"}
        </Badge>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      sortable: false,
      className: "w-[100px]",
      render: (p) => {
        const relative = formatRelativeTime(p.updatedAt);
        const recent = isUpdatedWithin24h(p.updatedAt);
        if (!relative) return <span className="text-muted-foreground/60 text-xs">—</span>;
        return (
          <span
            className={cn(
              "inline-block rounded px-2 py-1 text-[11px] text-muted-foreground/80",
              recent && "bg-primary/10 text-primary/90"
            )}
            title={p.updatedAt ? new Date(p.updatedAt).toLocaleString() : undefined}
          >
            {relative}
          </span>
        );
      },
    },
    {
      key: "_actions",
      header: "",
      sortable: false,
      className: "w-[1%] whitespace-nowrap text-right",
      render: (p) => {
        if (p.id.startsWith("temp-")) return null;
        return (
          <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Quick preview"
                    onClick={(e) => {
                      e.preventDefault();
                      onPreview(p);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Quick preview</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-sky-600 hover:bg-sky-500/15 hover:text-sky-700 dark:text-sky-400"
                    aria-label="Edit project"
                    onClick={(e) => {
                      e.preventDefault();
                      onEditProject(p);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Edit project</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Project settings" asChild>
                    <Link href={`/dashboard/projects/${p.id}/settings`}>
                      <Settings className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Settings</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Remove project"
                    onClick={(e) => {
                      e.preventDefault();
                      onRemove(p);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Archive or delete</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    },
  ];
}

type ViewMode = "grid" | "list";
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "name_asc", label: "Name (A–Z)" },
  { value: "name_desc", label: "Name (Z–A)" },
  { value: "status_asc", label: "Status (Active first)" },
  { value: "status_desc", label: "Status (Archived first)" },
  { value: "visibility_asc", label: "Visibility" },
  { value: "updated_desc", label: "Last updated (newest)" },
  { value: "updated_asc", label: "Last updated (oldest)" },
  { value: "created_desc", label: "Created (newest)" },
  { value: "created_asc", label: "Created (oldest)" },
  { value: "tasks_desc", label: "Most tasks" },
  { value: "tasks_asc", label: "Fewest tasks" },
  { value: "overdue_desc", label: "Most overdue" },
  { value: "overdue_asc", label: "Fewest overdue" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
] as const;

const VISIBILITY_FILTER_OPTIONS = [
  { value: "", label: "All visibility" },
  { value: "PRIVATE", label: "Private" },
  { value: "PUBLIC", label: "Public" },
] as const;

const ACTIVITY_FILTER_OPTIONS = [
  { value: "", label: "Anytime" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
] as const;

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { orgId, setOrgId } = useTenant();
  const { toast } = useToast();
  const upgradeModal = useUpgradeModalOptional();
  const onboarding = useOnboardingOptional();
  const analytics = useAnalytics();
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  /** When set, project form modal opens in edit mode (same UI as create). */
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectIconUrl, setProjectIconUrl] = useState<string | null>(null);
  const projectModalOpen = createOpen || !!editingProject;
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<{ key: keyof Project | string; direction: SortDirection } | null>({ key: "name", direction: "asc" });
  const [nameFilter, setNameFilter] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterVisibility, setFilterVisibility] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [filterActivity, setFilterActivity] = useState("");
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [removeTarget, setRemoveTarget] = useState<Project | null>(null);
  const [previewProject, setPreviewProject] = useState<Project | null>(null);
  const pageSize = 10;

  // Map (key, direction) to dropdown sortKey for keeping dropdown in sync when table header is clicked
  const sortKeyFromSort = useMemo(() => {
    if (!sort) return "name_asc";
    const { key, direction } = sort;
    const d = direction === "asc" ? "asc" : "desc";
    if (key === "name") return d === "asc" ? "name_asc" : "name_desc";
    if (key === "isArchived") return d === "asc" ? "status_asc" : "status_desc";
    if (key === "visibility") return "visibility_asc";
    if (key === "updatedAt") return d === "asc" ? "updated_asc" : "updated_desc";
    if (key === "createdAt") return d === "asc" ? "created_asc" : "created_desc";
    if (key === "taskCount") return d === "asc" ? "tasks_asc" : "tasks_desc";
    if (key === "overdue") return d === "asc" ? "overdue_asc" : "overdue_desc";
    return "name_asc";
  }, [sort]);

  const handleSortKeyChange = (value: string) => {
    if (value === "name_asc") setSort({ key: "name", direction: "asc" });
    else if (value === "name_desc") setSort({ key: "name", direction: "desc" });
    else if (value === "status_asc") setSort({ key: "isArchived", direction: "asc" });
    else if (value === "status_desc") setSort({ key: "isArchived", direction: "desc" });
    else if (value === "visibility_asc") setSort({ key: "visibility", direction: "asc" });
    else if (value === "updated_desc") setSort({ key: "updatedAt", direction: "desc" });
    else if (value === "updated_asc") setSort({ key: "updatedAt", direction: "asc" });
    else if (value === "created_desc") setSort({ key: "createdAt", direction: "desc" });
    else if (value === "created_asc") setSort({ key: "createdAt", direction: "asc" });
    else if (value === "tasks_desc") setSort({ key: "taskCount", direction: "desc" });
    else if (value === "tasks_asc") setSort({ key: "taskCount", direction: "asc" });
    else if (value === "overdue_desc") setSort({ key: "overdue", direction: "desc" });
    else if (value === "overdue_asc") setSort({ key: "overdue", direction: "asc" });
  };

  const handleTableSortChange = useCallback((key: keyof Project | string, direction: SortDirection) => {
    setSort({ key, direction });
  }, []);

  const { data: projects = [], isLoading, error, isError } = useQuery({
    queryKey: ["projects", orgId ?? ""],
    queryFn: fetchProjects,
    enabled: !!orgId,
  });

  const { data: orgMembers = [] } = useQuery({
    queryKey: ["org-members", orgId ?? ""],
    queryFn: () => fetchOrgMembers(orgId!),
    enabled: !!orgId,
  });

  const { data: workspaces = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: fetchOrganizations,
  });

  const createFormDefaults = useMemo(
    () =>
      ({
        name: "",
        description: "",
        visibility: "PRIVATE",
        workspaceId: orgId ?? "",
      }) satisfies CreateFormData,
    [orgId]
  );

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: createFormDefaults,
  });

  const selectedWorkspaceId = watch("workspaceId");
  const createProjectName = watch("name");

  useEffect(() => {
    if (createOpen && orgId && !editingProject) {
      setValue("workspaceId", orgId);
    }
  }, [createOpen, orgId, editingProject, setValue]);

  useEffect(() => {
    if (!editingProject) return;
    reset({
      name: editingProject.name,
      description: editingProject.description ?? "",
      visibility: editingProject.visibility ?? "PRIVATE",
      workspaceId: editingProject.organizationId,
    });
    setProjectIconUrl(editingProject.iconUrl ?? null);
  }, [editingProject?.id, reset]);

  function openProjectEditModal(p: Project) {
    if (p.id.startsWith("temp-")) return;
    setCreateOpen(false);
    setEditingProject(p);
  }

  type CreateMutationVars = { payload: CreateProjectPayload; targetOrgId: string };

  const createMutation = useMutation({
    mutationFn: ({ payload, targetOrgId }: CreateMutationVars) => createProject(payload, targetOrgId),
    onMutate: async ({ payload, targetOrgId }) => {
      await queryClient.cancelQueries({ queryKey: ["projects", targetOrgId] });
      const previous = queryClient.getQueryData<Project[]>(["projects", targetOrgId]);
      const previousCount = (previous ?? []).length;
      if (targetOrgId === orgId) {
        const optimistic: Project = {
          id: `temp-${Date.now()}`,
          organizationId: targetOrgId,
          name: payload.name,
          description: payload.description,
          visibility: payload.visibility ?? "PRIVATE",
          isArchived: false,
          createdBy: "",
          iconUrl: payload.iconUrl ?? null,
        };
        queryClient.setQueryData<Project[]>(["projects", targetOrgId], (old) => [...(old ?? []), optimistic]);
      }
      return { previous, previousCount, targetOrgId };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous != null && context.targetOrgId) {
        queryClient.setQueryData(["projects", context.targetOrgId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onSuccess: (_data, { targetOrgId }, context) => {
      setCreateOpen(false);
      setProjectIconUrl(null);
      reset({
        name: "",
        description: "",
        visibility: "PRIVATE",
        workspaceId: targetOrgId,
      });
      if (targetOrgId !== orgId) {
        setOrgId(targetOrgId);
        router.refresh();
      }
      analytics.track("project_created", { workspaceId: targetOrgId });
      const wasFirstProject = context?.previousCount === 0;
      if (wasFirstProject) {
        onboarding?.markStepCompleted("project");
        analytics.track("first_project_created", {});
        router.push("/dashboard");
      }
    },
  });

  const updateProjectFormMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProjectPayload }) => updateProject(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      setEditingProject(null);
      setProjectIconUrl(null);
      reset(createFormDefaults);
      toast({ title: "Project updated", variant: "success" });
      analytics.track("project_updated", {});
    },
    onError: (err) => {
      toast({ title: "Failed to update project", description: parseApiError(err), variant: "error" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) =>
      updateProject(id, { isArchived }),
    onSuccess: (_, { isArchived }) => {
      queryClient.invalidateQueries({ queryKey: ["projects", orgId ?? ""] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setRemoveTarget(null);
      toast({
        title: isArchived ? "Project archived" : "Project restored",
        variant: "success",
      });
    },
    onError: (err) => {
      toast({ title: "Failed to update project", description: parseApiError(err), variant: "error" });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => deleteProjectPermanently(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", orgId ?? ""] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setRemoveTarget(null);
      toast({ title: "Project deleted permanently", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Failed to delete project",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  function onSubmit(values: CreateFormData) {
    if (editingProject) {
      const payload: UpdateProjectPayload = {
        name: values.name,
        description: values.description || undefined,
        visibility: values.visibility || "PRIVATE",
        iconUrl: projectIconUrl?.trim() ? projectIconUrl : "",
      };
      updateProjectFormMutation.mutate({ id: editingProject.id, payload });
      return;
    }
    createMutation.mutate({
      targetOrgId: values.workspaceId,
      payload: {
        name: values.name,
        description: values.description || undefined,
        visibility: values.visibility || "PRIVATE",
        iconUrl: projectIconUrl || undefined,
      },
    });
  }

  const formBusy = createMutation.isPending || updateProjectFormMutation.isPending;

  const filteredOnly = useMemo(() => {
    let list = projects ?? [];
    if (nameFilter.trim()) {
      const q = nameFilter.trim().toLowerCase();
      list = list.filter((p) => {
        const plain = stripHtmlToPlainText(p.description ?? "");
        return p.name.toLowerCase().includes(q) || plain.toLowerCase().includes(q);
      });
    }
    if (filterStatus) {
      if (filterStatus === "active") list = list.filter((p) => !p.isArchived);
      if (filterStatus === "archived") list = list.filter((p) => p.isArchived);
    }
    if (filterVisibility) {
      list = list.filter((p) => p.visibility === filterVisibility);
    }
    if (filterOwner) {
      list = list.filter((p) => p.createdBy === filterOwner);
    }
    if (filterActivity && list.length > 0) {
      const now = Date.now();
      const ms = { "24h": 24 * 60 * 60 * 1000, "7d": 7 * 24 * 60 * 60 * 1000, "30d": 30 * 24 * 60 * 60 * 1000 }[filterActivity];
      if (ms) list = list.filter((p) => p.updatedAt && now - new Date(p.updatedAt).getTime() < ms);
    }
    return list;
  }, [projects, nameFilter, filterStatus, filterVisibility, filterOwner, filterActivity]);

  const filteredOnlyIds = useMemo(() => filteredOnly.map((p) => p.id).filter((id) => !id.startsWith("temp-")), [filteredOnly]);
  const needsTaskStats = sort?.key === "taskCount" || sort?.key === "overdue" || filterOverdue || filteredOnlyIds.length <= 25;
  const taskStatsQueries = useQueries({
    queries: filteredOnlyIds.map((id) => ({
      queryKey: ["tasks", id, "stats"],
      queryFn: () => fetchTasksByProject(id, 1, 50),
      enabled: !!id && !!needsTaskStats,
      staleTime: 30_000,
    })),
  });

  const filteredAfterOverdue = useMemo(() => {
    if (!filterOverdue) return filteredOnly;
    const now = Date.now();
    return filteredOnly.filter((p) => {
      const idx = filteredOnlyIds.indexOf(p.id);
      const tasks = taskStatsQueries[idx]?.data?.data ?? [];
      const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate).getTime() < now).length;
      return overdue > 0;
    });
  }, [filteredOnly, filterOverdue, filteredOnlyIds, taskStatsQueries]);

  const filteredAndSorted = useMemo(() => {
    let list = [...filteredAfterOverdue];
    if (!sort) return list;
    const k = sort.key;
    const dir = sort.direction === "desc" ? -1 : 1;
    if (k === "updatedAt" || k === "createdAt") {
      list.sort((a, b) => {
        const aVal = (a as Project & { updatedAt?: string; createdAt?: string })[k as "updatedAt" | "createdAt"];
        const bVal = (b as Project & { updatedAt?: string; createdAt?: string })[k as "updatedAt" | "createdAt"];
        const aMs = aVal ? new Date(aVal).getTime() : 0;
        const bMs = bVal ? new Date(bVal).getTime() : 0;
        return (aMs - bMs) * dir;
      });
    } else if (k === "taskCount") {
      list.sort((a, b) => {
        const aIdx = filteredOnlyIds.indexOf(a.id);
        const bIdx = filteredOnlyIds.indexOf(b.id);
        const aTotal = aIdx >= 0 ? taskStatsQueries[aIdx]?.data?.meta?.total ?? 0 : 0;
        const bTotal = bIdx >= 0 ? taskStatsQueries[bIdx]?.data?.meta?.total ?? 0 : 0;
        return (aTotal - bTotal) * dir;
      });
    } else if (k === "overdue") {
      const now = Date.now();
      list.sort((a, b) => {
        const aIdx = filteredOnlyIds.indexOf(a.id);
        const bIdx = filteredOnlyIds.indexOf(b.id);
        const aTasks = taskStatsQueries[aIdx]?.data?.data ?? [];
        const bTasks = taskStatsQueries[bIdx]?.data?.data ?? [];
        const aOverdue = aTasks.filter((t) => t.dueDate && new Date(t.dueDate).getTime() < now).length;
        const bOverdue = bTasks.filter((t) => t.dueDate && new Date(t.dueDate).getTime() < now).length;
        return (aOverdue - bOverdue) * dir;
      });
    } else {
      const sortKey = k as keyof Project;
      list.sort((a, b) => {
        const av = (a[sortKey] as string | number | boolean) ?? "";
        const bv = (b[sortKey] as string | number | boolean) ?? "";
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return cmp * dir;
      });
    }
    return list;
  }, [filteredAfterOverdue, sort, filteredOnlyIds, taskStatsQueries]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, page, pageSize]);

  const projectIds = useMemo(() => paginated.filter((p) => !p.id.startsWith("temp-")).map((p) => p.id), [paginated]);
  const tasksQueries = useQueries({
    queries: projectIds.map((id) => ({
      queryKey: ["tasks", id],
      queryFn: () => fetchTasksByProject(id, 1, 50),
      enabled: !!id,
      staleTime: 20_000,
      refetchInterval: 10_000,
    })),
  });
  const workflowsQueries = useQueries({
    queries: projectIds.map((id) => ({
      queryKey: ["workflows", id],
      queryFn: () => fetchWorkflowsByProject(id),
      enabled: !!id,
      staleTime: 60_000,
    })),
  });
  const defaultWorkflowIds = useMemo(
    () => workflowsQueries.map((q) => q.data?.find((w) => w.isDefault)?.id),
    [workflowsQueries]
  );
  const uniqueDefaultWorkflowIds = useMemo(
    () => Array.from(new Set(defaultWorkflowIds.filter((id): id is string => !!id))),
    [defaultWorkflowIds]
  );
  const statusesQueries = useQueries({
    queries: uniqueDefaultWorkflowIds.map((workflowId) => ({
      queryKey: ["workflow-statuses", workflowId],
      queryFn: () => fetchWorkflowStatuses(workflowId),
      enabled: !!workflowId,
      staleTime: 60_000,
      refetchInterval: 15_000,
    })),
  });
  const doneStatusIdsByWorkflowId = useMemo(() => {
    const m = new Map<string, string[]>();
    uniqueDefaultWorkflowIds.forEach((workflowId, j) => {
      const statuses = statusesQueries[j]?.data;
      if (statuses) m.set(workflowId, getDoneStatusIds(statuses));
    });
    return m;
  }, [uniqueDefaultWorkflowIds, statusesQueries]);
  const membersQueries = useQueries({
    queries: projectIds.map((id) => ({
      queryKey: ["project-members", id],
      queryFn: () => fetchProjectMembers(id),
      enabled: !!id,
      staleTime: 60_000,
    })),
  });

  const activeFilterCount = [filterStatus, filterVisibility, filterOwner, filterActivity, filterOverdue].filter(Boolean).length;
  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterVisibility, filterOwner, filterActivity, filterOverdue]);

  const uniqueOwnerIds = useMemo(
    () => Array.from(new Set((projects ?? []).map((p) => p.createdBy).filter(Boolean))),
    [projects]
  );

  const projectCount = projects.length;
  const projectGate = useFeatureGate("projects", projectCount);
  const canCreateProject = projectGate.allowed;

  function clearAllFilters() {
    setFilterStatus("");
    setFilterVisibility("");
    setFilterOwner("");
    setFilterActivity("");
    setFilterOverdue(false);
    setFilterOpen(false);
  }

  const summaryMetrics = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => !p.isArchived).length;
    const archived = projects.filter((p) => p.isArchived).length;
    let overdue: number | null = null;
    if (needsTaskStats && taskStatsQueries.length > 0) {
      const now = Date.now();
      overdue = filteredOnly.filter((p) => {
        const idx = filteredOnlyIds.indexOf(p.id);
        const tasks = taskStatsQueries[idx]?.data?.data ?? [];
        return tasks.some((t) => t.dueDate && new Date(t.dueDate).getTime() < now);
      }).length;
    }
    return { total, active, archived, overdue };
  }, [projects, needsTaskStats, taskStatsQueries, filteredOnly, filteredOnlyIds]);

  function handleNewProjectClick() {
    if (!canCreateProject && upgradeModal) {
      analytics.track("limit_reached", { limit: "projects", current: projectCount });
      upgradeModal.openUpgradeModal("limit");
      return;
    }
    setTemplateModalOpen(true);
  }

  function handleTemplateSelect(template: ProjectTemplate | null) {
    setTemplateModalOpen(false);
    setEditingProject(null);
    setCreateOpen(true);
    setProjectIconUrl(null);
    const ws = orgId ?? "";
    if (template && template.id !== "blank") {
      const descHtml = template.description.trim()
        ? `<p>${escapeHtml(template.description)}</p>`
        : "";
      reset({ name: template.name, description: descHtml, visibility: "PRIVATE", workspaceId: ws });
    } else {
      reset({ name: "", description: "", visibility: "PRIVATE", workspaceId: ws });
    }
  }

  function handleWorkspaceSwitch(nextWorkspaceId: string) {
    if (!nextWorkspaceId || nextWorkspaceId === orgId) return;
    setOrgId(nextWorkspaceId);
    setPage(1);
    clearAllFilters();
    setNameFilter("");
    router.refresh();
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage and organize your team&apos;s work</p>
          <div className="mt-3 w-[260px] max-w-full">
            <Label
              htmlFor="projects-workspace-switcher"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
            >
              Switch Workspace
            </Label>
            <Select
              value={orgId ?? ""}
              onValueChange={handleWorkspaceSwitch}
              disabled={workspaces.length === 0}
            >
              <SelectTrigger
                id="projects-workspace-switcher"
                className="h-10 w-full"
                aria-label="Switch workspace for projects"
              >
                <SelectValue placeholder="Select workspace" />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((w: Organization) => (
                  <SelectItem key={w.id} value={w.id} textValue={w.name}>
                    <span className="flex min-w-0 w-full items-center gap-2">
                      <WorkspaceThumb workspace={w} size="sm" className="shrink-0" />
                      <span className="min-w-0 flex-1 truncate font-medium">{w.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu open={filterOpen} onOpenChange={setFilterOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5" aria-label="Filter projects">
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-medium text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 p-0" sideOffset={8} onClick={(e) => e.stopPropagation()}>
              <div className="border-b px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Filters</span>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="text-xs text-primary hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                  <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
                    <SelectTrigger className="mt-1 h-9 text-sm">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_FILTER_OPTIONS.map((o) => (
                        <SelectItem key={o.value || "all"} value={o.value || "all"}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Visibility</Label>
                  <Select value={filterVisibility || "all"} onValueChange={(v) => setFilterVisibility(v === "all" ? "" : v)}>
                    <SelectTrigger className="mt-1 h-9 text-sm">
                      <SelectValue placeholder="All visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      {VISIBILITY_FILTER_OPTIONS.map((o) => (
                        <SelectItem key={o.value || "all"} value={o.value || "all"}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Owner</Label>
                  <Select value={filterOwner || "all"} onValueChange={(v) => setFilterOwner(v === "all" ? "" : v)}>
                    <SelectTrigger className="mt-1 h-9 text-sm">
                      <SelectValue placeholder="All owners" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All owners</SelectItem>
                      {uniqueOwnerIds.map((userId) => {
                        const member = orgMembers.find((m) => m.userId === userId);
                        const label = member?.user?.fullName ?? member?.user?.email ?? "Unknown";
                        return (
                          <SelectItem key={userId} value={userId}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Activity</Label>
                  <Select value={filterActivity || "all"} onValueChange={(v) => setFilterActivity(v === "all" ? "" : v)}>
                    <SelectTrigger className="mt-1 h-9 text-sm">
                      <SelectValue placeholder="Anytime" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_FILTER_OPTIONS.map((o) => (
                        <SelectItem key={o.value || "all"} value={o.value || "all"}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
            >
              <GridViewIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <ListViewIcon className="h-4 w-4" />
            </Button>
          </div>
          <Select value={sortKeyFromSort} onValueChange={handleSortKeyChange}>
            <SelectTrigger className="w-[180px]" aria-label="Sort by">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleNewProjectClick}
            disabled={!orgId}
            title={!canCreateProject ? "Project limit reached. Upgrade to add more." : undefined}
            data-cy="projects-new-button"
          >
            {canCreateProject ? (
              <span className="flex items-center gap-2"><Plus className="h-4 w-4" /> New Project</span>
            ) : (
              <span className="flex items-center gap-2"><Lock className="h-4 w-4" /> Limit Reached</span>
            )}
          </Button>
        </div>
      </div>

      {/* Template selection modal */}
      <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
        <DialogContent className="max-w-2xl" data-cy="project-template-modal">
          <DialogHeader>
            <DialogTitle>Choose a template</DialogTitle>
            <DialogDescription>
              Start with a predefined structure or create from scratch. You can customize everything later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {PROJECT_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleTemplateSelect(template)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                  "hover:border-primary/50 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                )}
                data-cy={`template-${template.id}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {template.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{template.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{template.description}</p>
                </div>
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleTemplateSelect(null)}
              className={cn(
                "flex items-start gap-3 rounded-xl border border-dashed p-4 text-left transition-colors",
                "hover:border-primary/50 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              )}
              data-cy="template-blank"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <SquarePen className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">Start from blank</p>
                <p className="mt-0.5 text-sm text-muted-foreground">Create a project with no preset structure</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Project summary metrics bar – clickable to filter */}
      {!isLoading && projects.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 px-3 py-2">
          <button
            type="button"
            onClick={() => { setFilterStatus(""); setFilterOverdue(false); setPage(1); }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              !filterStatus && !filterOverdue
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            aria-pressed={!filterStatus && !filterOverdue}
            aria-label="Show all projects"
          >
            <FolderKanban className="h-4 w-4 shrink-0" />
            Total
            <span className="tabular-nums">{summaryMetrics.total}</span>
          </button>
          <button
            type="button"
            onClick={() => { setFilterStatus("active"); setFilterOverdue(false); setPage(1); }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              filterStatus === "active" && !filterOverdue
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            aria-pressed={filterStatus === "active" && !filterOverdue}
            aria-label="Show active projects only"
          >
            Active
            <span className="tabular-nums">{summaryMetrics.active}</span>
          </button>
          <button
            type="button"
            onClick={() => { setFilterStatus("archived"); setFilterOverdue(false); setPage(1); }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              filterStatus === "archived" && !filterOverdue
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            aria-pressed={filterStatus === "archived" && !filterOverdue}
            aria-label="Show archived projects only"
          >
            Archived
            <span className="tabular-nums">{summaryMetrics.archived}</span>
          </button>
          <button
            type="button"
            onClick={() => { setFilterOverdue(true); setPage(1); }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              filterOverdue
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            aria-pressed={filterOverdue}
            aria-label="Show projects with overdue tasks only"
          >
            <CalendarClock className="h-4 w-4 shrink-0" />
            Overdue
            <span className="tabular-nums">{summaryMetrics.overdue ?? "—"}</span>
          </button>
        </div>
      )}

      {/* Create / edit project — same modal */}
      <Dialog
        open={projectModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditingProject(null);
            setProjectIconUrl(null);
            reset(createFormDefaults);
          }
        }}
      >
        <DialogContent
          className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl"
          data-cy={editingProject ? "edit-project-form" : "create-project-form"}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8 text-left">
              {editingProject ? (
                <Pencil className="h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" />
              ) : (
                <Plus className="h-5 w-5 shrink-0 text-primary" />
              )}
              {editingProject ? "Edit project" : "Create Project"}
            </DialogTitle>
            <DialogDescription>
              {editingProject
                ? "Update name, description, and icon. Workspace cannot be moved here."
                : "Choose a workspace, then name your project. Optional rich description and icon."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-1">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Workspace
                </Label>
                <Select
                  value={selectedWorkspaceId || undefined}
                  onValueChange={(v) => setValue("workspaceId", v, { shouldValidate: true })}
                  disabled={workspaces.length === 0 || !!editingProject}
                >
                  <SelectTrigger className="h-10" aria-label="Workspace for project">
                    {/*
                      SelectValue mirrors the selected SelectItem (thumb + name). Avoid a second thumb in the trigger.
                    */}
                    <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden pr-1 text-left">
                      <SelectValue
                        placeholder="Select workspace"
                        className="min-w-0 flex-1 truncate data-[placeholder]:truncate"
                      />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((w: Organization) => (
                      <SelectItem
                        key={w.id}
                        value={w.id}
                        textValue={`${w.name}${w.isArchived ? " (archived)" : ""}`}
                      >
                        <span className="flex min-w-0 w-full items-center gap-2">
                          <WorkspaceThumb workspace={w} size="sm" className="shrink-0" />
                          <span className="min-w-0 flex-1 truncate font-medium">{w.name}</span>
                          {w.isArchived && (
                            <span className="shrink-0 text-xs text-muted-foreground">(archived)</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.workspaceId && (
                  <p className="text-xs text-destructive">{errors.workspaceId.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {editingProject
                    ? "This project stays in its current workspace."
                    : "Projects belong to one workspace. Choose where this project should live."}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Project Name
                </Label>
                <Input id="name" {...register("name")} placeholder="e.g. Marketing Website" data-cy="project-name-input" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description (optional)
                </Label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <ProjectFormDescriptionEditor
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="Brief description of the project"
                      disabled={formBusy}
                    />
                  )}
                />
                {errors.description && (
                  <p className="text-xs text-destructive">{errors.description.message}</p>
                )}
              </div>
              <ProjectIconPicker
                value={projectIconUrl}
                onChange={setProjectIconUrl}
                projectNamePlaceholder={createProjectName?.trim() || "Project"}
                disabled={formBusy}
              />
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={formBusy || (!editingProject && !selectedWorkspaceId)}
                  data-cy={editingProject ? "project-edit-submit" : "project-create-submit"}
                >
                  {formBusy ? (
                    editingProject ? "Saving…" : "Creating…"
                  ) : editingProject ? (
                    <span className="flex items-center gap-2">Save changes</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Create <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateOpen(false);
                    setEditingProject(null);
                    setProjectIconUrl(null);
                    reset(createFormDefaults);
                  }}
                >
                  Cancel
                </Button>
              </div>
              {createMutation.error && !editingProject && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
                  <p className="text-sm text-destructive">
                    {isRateLimited(createMutation.error) ? "Too many requests. Try again later." : parseApiError(createMutation.error)}
                  </p>
                </div>
              )}
              {updateProjectFormMutation.error && editingProject && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
                  <p className="text-sm text-destructive">
                    {isRateLimited(updateProjectFormMutation.error)
                      ? "Too many requests. Try again later."
                      : parseApiError(updateProjectFormMutation.error)}
                  </p>
                </div>
              )}
          </form>
        </DialogContent>
      </Dialog>

      {/* Table / list */}
      <div>
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        )}
        {isError && error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
            <p className="text-sm text-destructive">{parseApiError(error)}</p>
          </div>
        )}
        {!isLoading && projects && projects.length === 0 && !projectModalOpen && (
          <ProjectsEmptyState
            onCreateClick={() => setTemplateModalOpen(true)}
            canCreate={canCreateProject}
            onUpgradeClick={() => upgradeModal?.openUpgradeModal("limit")}
          />
        )}
        {!isLoading && projects && projects.length > 0 && viewMode === "list" && (
          <DataTable<Project>
            columns={getProjectColumns(tasksQueries, projectIds, defaultWorkflowIds, doneStatusIdsByWorkflowId, membersQueries, {
              onRemove: setRemoveTarget,
              onPreview: setPreviewProject,
              onEditProject: openProjectEditModal,
            })}
            data={paginated}
            keyExtractor={(p) => p.id}
            sort={sort ?? undefined}
            onSortChange={handleTableSortChange}
            totalCount={filteredAndSorted.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            pageSizeOptions={[10, 25, 50]}
            columnFilters={{ name: nameFilter }}
            onColumnFilterChange={(key, value) => (key === "name" ? setNameFilter(value) : undefined)}
            emptyTitle="No projects match"
            emptyDescription="Try adjusting filters."
            aria-label="Projects table"
          />
        )}
        {!isLoading && projects && projects.length > 0 && viewMode === "grid" && (
          <div key={`grid-${sortKeyFromSort}-${page}`} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map((p, i) => {
              const idx = p.id.startsWith("temp-") ? -1 : projectIds.indexOf(p.id);
              const tasksData = idx >= 0 ? tasksQueries[idx]?.data : undefined;
              const membersData = idx >= 0 ? membersQueries[idx]?.data : undefined;
              const tasksLoading = idx >= 0 ? tasksQueries[idx]?.isLoading : false;
              const membersLoading = idx >= 0 ? membersQueries[idx]?.isLoading : false;
              const totalTasks = tasksData?.meta?.total ?? 0;
              const tasks = tasksData?.data ?? [];
              const defaultWfId = idx >= 0 ? defaultWorkflowIds[idx] : undefined;
              const doneStatusIds = defaultWfId ? doneStatusIdsByWorkflowId.get(defaultWfId) : undefined;
              const { progressPercent, completedCount, overdueCount } = projectProgressFromTasks(tasks, totalTasks, doneStatusIds);
              const health = projectHealthFromTasks(overdueCount, progressPercent, totalTasks);
              const sampleSize = Math.min(tasks.length, 50);
              const members = membersData ?? [];
              const displayMembers = members.slice(0, 4);
              const updatedRelative = formatRelativeTime(p.updatedAt);
              const recentlyUpdated = isUpdatedWithin24h(p.updatedAt);

              return (
                <Card
                  key={p.id}
                  className={cn(
                    "overflow-hidden transition-shadow hover:shadow-premium flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300",
                    recentlyUpdated && "ring-1 ring-primary/30 bg-primary/[0.02]"
                  )}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-2 p-4 pb-2">
                    <Link href={p.id.startsWith("temp-") ? "#" : `/dashboard/projects/${p.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                      <ProjectHealthDot health={health} loading={tasksLoading} label={`${health}: ${overdueCount} overdue, ${progressPercent}% complete`} />
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10">
                        {p.iconUrl ? (
                          <img src={p.iconUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <FolderKanban className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <CardTitle className="text-base truncate">{p.name}</CardTitle>
                    </Link>
                    {p.id.startsWith("temp-") ? null : (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <TooltipProvider delayDuration={250}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-sky-600 hover:bg-sky-500/15 hover:text-sky-700 dark:text-sky-400 dark:hover:bg-sky-500/20 dark:hover:text-sky-300"
                                aria-label="Edit project"
                                onClick={() => openProjectEditModal(p)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Edit project</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "h-8 w-8",
                                  p.isArchived
                                    ? "text-emerald-600 hover:bg-emerald-500/15 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300"
                                    : "text-red-600 hover:bg-red-500/15 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/20 dark:hover:text-red-300"
                                )}
                                aria-label="Remove project"
                                onClick={() => setRemoveTarget(p)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Archive or delete</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" aria-label="More project actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/projects/${p.id}`} className="cursor-pointer">
                                Open board
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPreviewProject(p)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Quick preview
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0 px-4 pb-4 flex-1 flex flex-col gap-2.5">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {truncatePlainText(stripHtmlToPlainText(p.description), 200) || "No description"}
                    </p>

                    {/* Progress bar (animated, updates in real time via refetchInterval) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckSquare className="h-3.5 w-3.5" />
                          {tasksLoading ? "…" : `${totalTasks} task${totalTasks !== 1 ? "s" : ""}`}
                        </span>
                        <div className="flex items-center gap-2">
                          {!tasksLoading && overdueCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive">
                              <CalendarClock className="h-3.5 w-3.5" />
                              {overdueCount} overdue
                            </span>
                          )}
                          {!tasksLoading && totalTasks > 0 && (
                            <span className="font-medium tabular-nums text-foreground">{progressPercent}%</span>
                          )}
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                          style={{ width: `${Math.min(100, progressPercent)}%` }}
                        />
                      </div>
                    </div>

                    {/* Task stats (compact) */}
                    {!tasksLoading && totalTasks > 0 && sampleSize > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        {completedCount} of {Math.min(totalTasks, sampleSize)} complete
                        {totalTasks > 50 && " (first 50)"}
                      </p>
                    )}

                    {/* Member avatars */}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-1 border-t border-border/60">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {membersLoading ? (
                          <span className="text-xs text-muted-foreground">Loading…</span>
                        ) : displayMembers.length > 0 ? (
                          <>
                            <div className="flex -space-x-2">
                              {displayMembers.map((m) => (
                                <Avatar key={m.id} className="h-6 w-6 border-2 border-background">
                                  <AvatarImage src={m.user?.avatarUrl} />
                                  <AvatarFallback className="text-[10px]">
                                    {(m.user?.fullName ?? m.user?.email ?? "?").slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                            {members.length > 4 && (
                              <span className="text-[11px] text-muted-foreground">+{members.length - 4}</span>
                            )}
                          </>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Users className="h-3.5 w-3.5" /> No members
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                          {p.visibility === "PRIVATE" && <Lock className="h-3 w-3" />}
                          {p.visibility}
                        </span>
                        <Badge variant={p.isArchived ? "statusArchived" : "statusActive"} className="text-[10px] px-2 py-0">
                          {p.isArchived ? "Archived" : "Active"}
                        </Badge>
                      </div>
                    </div>
                    {updatedRelative && (
                      <p className="text-[11px] text-muted-foreground/60 text-right mt-1" title={p.updatedAt ? new Date(p.updatedAt).toLocaleString() : undefined}>
                        Updated {updatedRelative}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        {viewMode === "grid" && filteredAndSorted.length > pageSize && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredAndSorted.length)} of {filteredAndSorted.length}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page * pageSize >= filteredAndSorted.length} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <ProjectRemoveDialog
        project={removeTarget}
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        archiveLoading={archiveMutation.isPending}
        deleteLoading={deleteProjectMutation.isPending}
        onArchive={async () => {
          if (!removeTarget || removeTarget.isArchived) return;
          await archiveMutation.mutateAsync({ id: removeTarget.id, isArchived: true });
        }}
        onRestore={async () => {
          if (!removeTarget || !removeTarget.isArchived) return;
          await archiveMutation.mutateAsync({ id: removeTarget.id, isArchived: false });
        }}
        onDeletePermanently={async () => {
          if (!removeTarget) return;
          await deleteProjectMutation.mutateAsync(removeTarget.id);
        }}
      />

      <ProjectPreviewDrawer
        project={previewProject}
        open={!!previewProject}
        onOpenChange={(open) => !open && setPreviewProject(null)}
      />
    </div>
  );
}
