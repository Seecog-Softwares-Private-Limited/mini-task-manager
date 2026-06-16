"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
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
import { fetchActivityLogs } from "@/services/api/activity-logs.api";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectsEmptyState } from "@/components/projects/projects-empty-state";
import {
  ProjectCard,
  ProjectHealthPill,
  PROJECT_HEALTH_CONFIG,
  projectHealthBadge,
  type ProjectHealthBadge,
} from "@/components/projects/project-card";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectPreviewDrawer } from "@/components/projects/project-preview-drawer";
import { ProjectRemoveDialog } from "@/components/projects/project-remove-dialog";
import { ProjectCreateEditModal } from "@/components/projects/project-create-edit-modal";
import {
  createProjectFormSchema,
  type CreateProjectFormData,
} from "@/lib/project-form-schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { cn, getInitials } from "@/lib/utils";
import { stripHtmlToPlainText, truncatePlainText } from "@/lib/project-description-plain";
import {
  formatActivityHumanReadable,
  getActivityVisual,
} from "@/lib/activity-display";
import { useProjectSelectionOptional } from "@/context/project-selection-context";
import { ScrollablePageLayout } from "@/components/dashboard/scrollable-page-layout";
import { buildTasksPageHref } from "@/lib/tasks-page-href";
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
  Activity,
  ListTodo,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Ban,
} from "lucide-react";
import type { Task } from "@/types/api";

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
    onMembers: (p: Project) => void;
  }
): DataTableColumn<Project>[] {
  const { onRemove, onPreview, onEditProject, onMembers } = options;
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
        const health = projectHealthBadge(overdueCount, progressPercent, totalTasks);
        return (
          <Link
            href={p.id.startsWith("temp-") ? "#" : `/dashboard/projects/${p.id}`}
            className="flex min-w-0 items-start gap-3 transition-colors hover:text-primary"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-primary/10">
              {p.iconUrl ? (
                <img src={p.iconUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <FolderKanban className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.name}</p>
              <div className="mt-1">
                <ProjectHealthPill health={health} loading={loading} />
              </div>
            </div>
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
        const displayMembers = members.slice(0, 3);
        const overflowCount = members.length > 3 ? members.length - 3 : 0;
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
                          {getInitials(m.user?.fullName ?? m.user?.email ?? "?")}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  {overflowCount > 0 && (
                    <span className="ml-0.5 flex h-7 min-w-[1.75rem] items-center justify-center rounded-full border border-border bg-muted/80 px-1 text-[10px] font-semibold text-muted-foreground">
                      +{overflowCount}
                    </span>
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
        const { progressPercent, completedCount, overdueCount } = projectProgressFromTasks(tasks, totalTasks, doneStatusIds);
        const health = projectHealthBadge(overdueCount, progressPercent, totalTasks);
        const showCriticalOverdue = health === "blocked" && overdueCount > 0;
        return (
          <div className="flex min-w-[160px] max-w-[220px] flex-col gap-1.5">
            {loading ? (
              <span className="text-xs text-muted-foreground">…</span>
            ) : totalTasks > 0 ? (
              <>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  <span className="font-medium tabular-nums text-foreground">{progressPercent}% complete</span>
                  <span className="mx-1.5 text-border/60">·</span>
                  <span className="tabular-nums">{completedCount} of {totalTasks} tasks</span>
                </p>
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500/70 to-indigo-500/70 transition-[width] duration-500 ease-out"
                    style={{ width: `${Math.min(100, progressPercent)}%` }}
                  />
                </div>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">No tasks</span>
            )}
            {!loading && overdueCount > 0 && (
              <span
                className={cn(
                  "inline-flex w-fit items-center gap-1 text-[11px] font-medium",
                  showCriticalOverdue
                    ? "text-red-600/70 dark:text-red-400/65"
                    : "text-amber-700/45 dark:text-amber-500/40"
                )}
              >
                <CalendarClock className="h-3 w-3 opacity-50" />
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
        p.visibility === "PRIVATE" ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/60 bg-slate-50/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600 dark:border-border/50 dark:bg-muted/20 dark:text-muted-foreground">
            <Lock className="h-3 w-3 opacity-70" />
            Private
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-slate-200/60 bg-slate-50/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:border-border/50 dark:bg-muted/20 dark:text-muted-foreground">
            Public
          </span>
        )
      ),
    },
    {
      key: "isArchived",
      header: "Status",
      sortable: true,
      render: (p) => (
        p.isArchived ? (
          <span className="inline-flex items-center rounded-full border border-slate-200/60 bg-slate-100/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:border-border/50 dark:bg-muted/40 dark:text-muted-foreground">
            Archived
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-emerald-200/50 bg-emerald-50/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700/90 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400/90">
            Active
          </span>
        )
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
          <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-within:opacity-100">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Open project" asChild>
                    <Link href={`/dashboard/projects/${p.id}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Open project</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="View tasks" asChild>
                    <Link href={buildTasksPageHref(p.id.startsWith("temp-") ? null : p.id)}>
                      <ListTodo className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">View tasks</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Project members" asChild>
                    <Link href={`/dashboard/projects/${p.id}/members`}>
                      <Users className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Members</TooltipContent>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More project actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onPreview(p)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Quick preview
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEditProject(p)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit project
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onRemove(p)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Archive or delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
  const projectSelection = useProjectSelectionOptional();
  const selectedProjectId = projectSelection?.selectedProjectId ?? null;
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

  const { data: recentActivityData } = useQuery({
    queryKey: ["activity-logs", orgId ?? "", "projects-page"],
    queryFn: () => fetchActivityLogs(1, 12),
    enabled: !!orgId,
    staleTime: 30_000,
  });

  const createFormDefaults = useMemo(
    () =>
      ({
        name: "",
        description: "",
        visibility: "PRIVATE",
        workspaceId: orgId ?? "",
      }) satisfies CreateProjectFormData,
    [orgId]
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isValid },
  } = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectFormSchema),
    defaultValues: createFormDefaults,
    mode: "onChange",
  });

  const selectedWorkspaceId = watch("workspaceId");
  const createProjectName = watch("name");
  const createDescription = watch("description");
  const createVisibility = watch("visibility");
  const canSubmitProject = isValid && !!createProjectName?.trim();

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

  function onSubmit(values: CreateProjectFormData) {
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
  const needsTaskStats =
    sort?.key === "taskCount" ||
    sort?.key === "overdue" ||
    filterOverdue ||
    filteredOnlyIds.length <= 50;
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

  const projectHealthSummary = useMemo(() => {
    const counts: Record<ProjectHealthBadge, number> = {
      "on-track": 0,
      "at-risk": 0,
      blocked: 0,
      delayed: 0,
    };
    const now = Date.now();
    filteredOnly.forEach((p) => {
      if (p.id.startsWith("temp-")) return;
      const idx = filteredOnlyIds.indexOf(p.id);
      const tasksData = idx >= 0 ? taskStatsQueries[idx]?.data : undefined;
      const totalTasks = tasksData?.meta?.total ?? 0;
      const tasks = tasksData?.data ?? [];
      const overdueCount = tasks.filter(
        (t) => t.dueDate && new Date(t.dueDate).getTime() < now
      ).length;
      const doneCount = tasks.filter(
        (t) => (t.subtasks?.length ?? 0) === 0 || (t.subtasks ?? []).every((s) => s.completed)
      ).length;
      const sampleSize = Math.min(tasks.length, 50);
      const progressPercent =
        totalTasks === 0 || sampleSize === 0
          ? 0
          : Math.round((doneCount / Math.min(totalTasks, sampleSize)) * 100);
      const health = projectHealthBadge(overdueCount, progressPercent, totalTasks);
      counts[health] += 1;
    });
    return counts;
  }, [filteredOnly, filteredOnlyIds, taskStatsQueries]);

  const recentProjectActivity = useMemo(() => {
    const logs = recentActivityData?.data ?? [];
    return logs
      .filter((log) => {
        const entity = log.entityType?.toLowerCase() ?? "";
        return entity === "project" || entity === "task";
      })
      .slice(0, 5);
  }, [recentActivityData]);

  const cockpitSummary = useMemo(() => {
    const activeProjects = filteredOnly.filter(
      (p) => !p.isArchived && !p.id.startsWith("temp-")
    );
    let totalTasks = 0;
    let totalOverdue = 0;
    let completionSum = 0;
    let projectsWithProgress = 0;
    const now = Date.now();

    activeProjects.forEach((p) => {
      const idx = filteredOnlyIds.indexOf(p.id);
      if (idx < 0) return;
      const data = taskStatsQueries[idx]?.data;
      if (!data) return;
      const total = data.meta?.total ?? 0;
      const tasks = data.data ?? [];
      totalTasks += total;
      totalOverdue += tasks.filter(
        (t) => t.dueDate && new Date(t.dueDate).getTime() < now
      ).length;
      const done = tasks.filter(
        (t) =>
          (t.subtasks?.length ?? 0) === 0 || (t.subtasks ?? []).every((s) => s.completed)
      ).length;
      const sample = Math.min(tasks.length, 50);
      if (total > 0 && sample > 0) {
        completionSum += Math.round((done / Math.min(total, sample)) * 100);
        projectsWithProgress += 1;
      }
    });

    const avgCompletion =
      projectsWithProgress > 0 ? Math.round(completionSum / projectsWithProgress) : 0;

    return {
      active: activeProjects.length,
      totalTasks,
      totalOverdue,
      avgCompletion,
      statsPending: activeProjects.length > 0 && taskStatsQueries.some((q) => q.isLoading),
    };
  }, [filteredOnly, filteredOnlyIds, taskStatsQueries]);

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

  const healthSummaryIcons = {
    "on-track": CheckCircle2,
    "at-risk": AlertTriangle,
    delayed: Clock,
    blocked: Ban,
  } as const;

  const healthSummaryIconClass: Record<ProjectHealthBadge, string> = {
    "on-track": "text-emerald-600/75 dark:text-emerald-400/75",
    "at-risk": "text-orange-600/70 dark:text-orange-400/70",
    delayed: "text-amber-600/65 dark:text-amber-400/65",
    blocked: "text-red-600/65 dark:text-red-400/65",
  };

  return (
    <>
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
                  "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors duration-150",
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
                "flex items-start gap-3 rounded-xl border border-dashed p-4 text-left transition-colors duration-150",
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

      <ScrollablePageLayout
        className="min-h-0 flex-1"
        headerClassName="space-y-3"
        bodyClassName="pb-4"
        header={
          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Manage and organize your team&apos;s work
                </p>
              </div>
              <Button
                onClick={handleNewProjectClick}
                disabled={!orgId}
                title={!canCreateProject ? "Project limit reached. Upgrade to add more." : undefined}
                data-cy="projects-new-button"
                className="shrink-0 transition-opacity duration-150"
              >
                {canCreateProject ? (
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" /> New Project
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="h-4 w-4" /> Limit Reached
                  </span>
                )}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/15 px-3 py-2 transition-colors duration-150">
              <Select
                value={orgId ?? ""}
                onValueChange={handleWorkspaceSwitch}
                disabled={workspaces.length === 0}
              >
                <SelectTrigger
                  id="projects-workspace-switcher"
                  className="h-9 w-[min(100%,220px)] border-border/60 bg-card text-sm"
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

              <div className="hidden h-6 w-px bg-border/60 sm:block" aria-hidden />

              <DropdownMenu open={filterOpen} onOpenChange={setFilterOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 transition-colors duration-150" aria-label="Filter projects">
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
                  className="h-8 px-2.5 transition-colors duration-150"
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                >
                  <GridViewIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 px-2.5 transition-colors duration-150"
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                >
                  <ListViewIcon className="h-4 w-4" />
                </Button>
              </div>
              <Select value={sortKeyFromSort} onValueChange={handleSortKeyChange}>
                <SelectTrigger className="h-9 w-[min(100%,180px)] border-border/60 bg-card text-sm" aria-label="Sort by">
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
            </div>

            {!isLoading && projects.length > 0 && (
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {cockpitSummary.statsPending ? (
                  <span>Loading workspace overview…</span>
                ) : (
                  <>
                    <span className="font-medium tabular-nums text-foreground/90">
                      {cockpitSummary.active} active project{cockpitSummary.active === 1 ? "" : "s"}
                    </span>
                    <span className="mx-2 text-border/50">·</span>
                    <span className="tabular-nums">{cockpitSummary.totalTasks} tasks</span>
                    <span className="mx-2 text-border/50">·</span>
                    <span className="tabular-nums">{cockpitSummary.totalOverdue} overdue</span>
                    <span className="mx-2 text-border/50">·</span>
                    <span className="tabular-nums">{cockpitSummary.avgCompletion}% average completion</span>
                  </>
                )}
              </p>
            )}

            {!isLoading && projects.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/50 bg-card px-2.5 py-2 shadow-sm">
                <button
                  type="button"
                  onClick={() => { setFilterStatus(""); setFilterOverdue(false); setPage(1); }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150",
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
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150",
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
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150",
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
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150",
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
          </div>
        }
      >
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
              onMembers: (p) => router.push(`/dashboard/projects/${p.id}/members`),
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
          <div key={`grid-${sortKeyFromSort}-${page}`} className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              const { progressPercent, completedCount, overdueCount } = projectProgressFromTasks(
                tasks,
                totalTasks,
                doneStatusIds
              );
              const updatedRelative = formatRelativeTime(p.updatedAt);

              return (
                <ProjectCard
                  key={p.id}
                  project={p}
                  isSelected={selectedProjectId === p.id}
                  animationDelay={i * 40}
                  tasksLoading={tasksLoading}
                  membersLoading={membersLoading}
                  totalTasks={totalTasks}
                  completedCount={completedCount}
                  progressPercent={progressPercent}
                  overdueCount={overdueCount}
                  members={membersData ?? []}
                  updatedRelative={updatedRelative}
                  onOpen={() => router.push(`/dashboard/projects/${p.id}`)}
                  onViewTasks={() => router.push(buildTasksPageHref(p.id))}
                  onEdit={() => openProjectEditModal(p)}
                  onMembers={() => router.push(`/dashboard/projects/${p.id}/members`)}
                  onSettings={() => router.push(`/dashboard/projects/${p.id}/settings`)}
                  onPreview={() => setPreviewProject(p)}
                  onRemove={() => setRemoveTarget(p)}
                />
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

        {!isLoading && projects.length > 0 && viewMode === "grid" && (
          <div className="grid gap-3 pt-2 lg:grid-cols-2">
            <section
              aria-label="Project health summary"
              className="rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-violet-50/15 p-4 shadow-sm dark:to-violet-950/10"
            >
              <div className="mb-3">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">Project health</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Filtered project status snapshot
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(
                  ["on-track", "at-risk", "delayed", "blocked"] as const
                ).map((key) => {
                  const cfg = PROJECT_HEALTH_CONFIG[key];
                  const Icon = healthSummaryIcons[key];
                  return (
                    <div
                      key={key}
                      className={cn(
                        "rounded-lg border px-2.5 py-2 transition-colors duration-150 hover:bg-muted/10",
                        cfg.summaryBorder,
                        cfg.summaryBg
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className={cn("h-3.5 w-3.5 shrink-0", healthSummaryIconClass[key])} />
                        <span
                          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", cfg.dot)}
                          aria-hidden
                        />
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {cfg.label}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xl font-bold tabular-nums leading-none text-foreground">
                        {projectHealthSummary[key]}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section
              aria-label="Recent project activity"
              className="rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-violet-50/15 p-4 shadow-sm dark:to-violet-950/10"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight text-foreground">
                    <Activity className="h-4 w-4 text-violet-600/70 dark:text-violet-400/70" />
                    Recent activity
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Latest project and task updates
                  </p>
                </div>
                <Link
                  href="/dashboard/activity"
                  className="shrink-0 text-xs font-medium text-primary transition-colors duration-150 hover:underline"
                >
                  View all
                </Link>
              </div>
              {recentProjectActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent project activity.</p>
              ) : (
                <ul className="space-y-1.5" role="list">
                  {recentProjectActivity.map((log) => {
                    const visual = getActivityVisual(log);
                    const Icon = visual.icon;
                    return (
                      <li
                        key={log.id}
                        className="flex items-start gap-2.5 rounded-lg border border-border/35 bg-white/50 px-3 py-2 transition-colors duration-150 hover:bg-muted/20 dark:bg-card/40"
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                            visual.bgClassName
                          )}
                        >
                          <Icon className={cn("h-3 w-3", visual.iconClassName)} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] leading-snug text-foreground">
                            {formatActivityHumanReadable(log)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                            {formatRelativeTime(log.createdAt)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
      </ScrollablePageLayout>

      <ProjectCreateEditModal
        open={projectModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditingProject(null);
            setProjectIconUrl(null);
            reset(createFormDefaults);
          }
        }}
        editingProject={editingProject}
        workspaces={workspaces}
        register={register}
        control={control}
        errors={errors}
        setValue={setValue}
        handleSubmit={handleSubmit}
        onSubmit={onSubmit}
        selectedWorkspaceId={selectedWorkspaceId}
        projectName={createProjectName}
        description={createDescription ?? ""}
        visibility={createVisibility ?? "PRIVATE"}
        projectIconUrl={projectIconUrl}
        onProjectIconChange={setProjectIconUrl}
        formBusy={formBusy}
        canSubmit={canSubmitProject}
        createError={createMutation.error}
        updateError={updateProjectFormMutation.error}
        onCancel={() => {
          setCreateOpen(false);
          setEditingProject(null);
          setProjectIconUrl(null);
          reset(createFormDefaults);
        }}
      />

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
    </>
  );
}
