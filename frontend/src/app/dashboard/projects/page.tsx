"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { fetchProjects, createProject, updateProject, type CreateProjectPayload } from "@/services/api/projects.api";
import { parseApiError, isRateLimited } from "@/services/api/client";
import { useTenant } from "@/context/tenant-context";
import { useFeatureGate } from "@/hooks/use-feature-gate";
import { useUpgradeModalOptional } from "@/context/upgrade-modal-context";
import { useOnboardingOptional } from "@/context/onboarding-context";
import { useAnalytics } from "@/hooks/use-analytics";
import type { Project } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { DataTable, type DataTableColumn, type SortDirection } from "@/components/ui/data-table";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/use-toast";
import { FolderKanban, Plus, Lock, ArrowRight, X, LayoutGrid, List, MoreHorizontal, Archive, ArchiveRestore } from "lucide-react";

const createSchema = z.object({
  name: z.string().min(1, "Name required").max(200),
  description: z.string().max(2000).optional(),
  visibility: z.string().optional(),
});

type CreateFormData = z.infer<typeof createSchema>;

const projectColumns: DataTableColumn<Project>[] = [
  {
    key: "name",
    header: "Name",
    sortable: true,
    filterable: true,
    render: (p) => (
      <Link href={p.id.startsWith("temp-") ? "#" : `/dashboard/projects/${p.id}`} className="flex items-center gap-2 font-semibold hover:text-primary transition-colors">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <FolderKanban className="h-4 w-4 text-primary" />
        </div>
        {p.name}
      </Link>
    ),
  },
  { key: "description", header: "Description", sortable: false, render: (p) => <span className="text-muted-foreground">{p.description ?? "—"}</span> },
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
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${p.isArchived ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}>
        {p.isArchived ? "Archived" : "Active"}
      </span>
    ),
  },
];

type ViewMode = "grid" | "list";
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "name_asc", label: "Name (A–Z)" },
  { value: "name_desc", label: "Name (Z–A)" },
  { value: "status_asc", label: "Status (Active first)" },
  { value: "status_desc", label: "Status (Archived first)" },
  { value: "visibility_asc", label: "Visibility" },
];

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const { orgId } = useTenant();
  const { toast } = useToast();
  const upgradeModal = useUpgradeModalOptional();
  const onboarding = useOnboardingOptional();
  const analytics = useAnalytics();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortKey, setSortKey] = useState("name_asc");
  const [sort, setSort] = useState<{ key: keyof Project | string; direction: SortDirection } | null>({ key: "name", direction: "asc" });
  const [nameFilter, setNameFilter] = useState("");
  const [page, setPage] = useState(1);
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null);
  const pageSize = 10;

  // Sync sort from dropdown
  const handleSortKeyChange = (value: string) => {
    setSortKey(value);
    if (value === "name_asc") setSort({ key: "name", direction: "asc" });
    else if (value === "name_desc") setSort({ key: "name", direction: "desc" });
    else if (value === "status_asc") setSort({ key: "isArchived", direction: "asc" });
    else if (value === "status_desc") setSort({ key: "isArchived", direction: "desc" });
    else if (value === "visibility_asc") setSort({ key: "visibility", direction: "asc" });
  };

  const { data: projects = [], isLoading, error, isError } = useQuery({
    queryKey: ["projects", orgId ?? ""],
    queryFn: fetchProjects,
    enabled: !!orgId,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", description: "", visibility: "PRIVATE" },
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateProjectPayload) => createProject(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["projects", orgId ?? ""] });
      const previous = queryClient.getQueryData<Project[]>(["projects", orgId ?? ""]);
      const previousCount = (previous ?? []).length;
      const optimistic: Project = {
        id: `temp-${Date.now()}`,
        organizationId: orgId!,
        name: payload.name,
        description: payload.description,
        visibility: payload.visibility ?? "PRIVATE",
        isArchived: false,
        createdBy: "",
      };
      queryClient.setQueryData<Project[]>(["projects", orgId ?? ""], (old) => [...(old ?? []), optimistic]);
      return { previous, previousCount };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous != null) {
        queryClient.setQueryData(["projects", orgId ?? ""], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onSuccess: (_data, _vars, context: { previous?: Project[]; previousCount?: number } | undefined) => {
      setCreateOpen(false);
      reset();
      analytics.track("project_created", {});
      const wasFirstProject = context?.previousCount === 0;
      if (wasFirstProject) {
        onboarding?.markStepCompleted("project");
        analytics.track("first_project_created", {});
      }
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) =>
      updateProject(id, { isArchived }),
    onSuccess: (_, { isArchived }) => {
      queryClient.invalidateQueries({ queryKey: ["projects", orgId ?? ""] });
      setArchiveTarget(null);
      toast({
        title: isArchived ? "Project archived" : "Project restored",
        variant: "success",
      });
    },
    onError: (err) => {
      toast({ title: "Failed to update project", description: parseApiError(err), variant: "error" });
    },
  });

  function onSubmit(values: CreateFormData) {
    createMutation.mutate({
      name: values.name,
      description: values.description || undefined,
      visibility: values.visibility || "PRIVATE",
    });
  }

  const filteredAndSorted = useMemo(() => {
    let list = projects ?? [];
    if (nameFilter.trim()) {
      const q = nameFilter.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q));
    }
    if (sort) {
      const k = sort.key as keyof Project;
      list = [...list].sort((a, b) => {
        const av = (a[k] as string | number | boolean) ?? "";
        const bv = (b[k] as string | number | boolean) ?? "";
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sort.direction === "desc" ? -cmp : cmp;
      });
    }
    return list;
  }, [projects, nameFilter, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, page, pageSize]);

  const projectCount = projects.length;
  const projectGate = useFeatureGate("projects", projectCount);
  const canCreateProject = projectGate.allowed;

  function handleNewProjectClick() {
    if (!canCreateProject && upgradeModal) {
      analytics.track("limit_reached", { limit: "projects", current: projectCount });
      upgradeModal.openUpgradeModal("limit");
      return;
    }
    setCreateOpen(true);
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage and organize your team&apos;s work</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Select value={sortKey} onValueChange={handleSortKeyChange}>
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

      {/* Create form */}
      {createOpen && (
        <Card className="border-primary/20 shadow-glow" data-cy="create-project-form">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5 text-primary" />
              Create Project
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setCreateOpen(false); reset(); }}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Project Name
                </Label>
                <Input id="name" {...register("name")} placeholder="e.g. Marketing Website" data-cy="project-name-input" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description (optional)
                </Label>
                <Input id="description" {...register("description")} placeholder="Brief description of the project" />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={createMutation.isPending} data-cy="project-create-submit">
                  {createMutation.isPending ? "Creating..." : (
                    <span className="flex items-center gap-2">Create <ArrowRight className="h-4 w-4" /></span>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setCreateOpen(false); reset(); }}>
                  Cancel
                </Button>
              </div>
              {createMutation.error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
                  <p className="text-sm text-destructive">
                    {isRateLimited(createMutation.error) ? "Too many requests. Try again later." : parseApiError(createMutation.error)}
                  </p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Table / list */}
      <div>
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        )}
        {isError && error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
            <p className="text-sm text-destructive">{parseApiError(error)}</p>
          </div>
        )}
        {!isLoading && projects && projects.length === 0 && !createOpen && (
          <EmptyState
            title="No projects yet"
            description="Create your first project to get started."
            valueProp="Projects keep work organized by initiative or team. Add one to start tracking tasks."
            icon={<FolderKanban className="h-12 w-12" />}
            action={{
              label: canCreateProject ? "Create project" : "Upgrade to create projects",
              onClick: () => (canCreateProject ? setCreateOpen(true) : upgradeModal?.openUpgradeModal("limit")),
            }}
          />
        )}
        {!isLoading && projects && projects.length > 0 && viewMode === "list" && (
          <DataTable<Project>
            columns={projectColumns}
            data={paginated}
            keyExtractor={(p) => p.id}
            sort={sort ?? undefined}
            onSortChange={(key, direction) => setSort({ key, direction })}
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map((p) => (
              <Card key={p.id} className="overflow-hidden transition-shadow hover:shadow-premium">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-2 pb-2">
                  <Link href={p.id.startsWith("temp-") ? "#" : `/dashboard/projects/${p.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <FolderKanban className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base truncate">{p.name}</CardTitle>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Project actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setArchiveTarget(p)}>
                        {p.isArchived ? (
                          <><ArchiveRestore className="mr-2 h-4 w-4" /> Unarchive</>
                        ) : (
                          <><Archive className="mr-2 h-4 w-4" /> Archive</>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2">{p.description ?? "No description"}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {p.visibility === "PRIVATE" && <Lock className="h-3 w-3" />}
                      {p.visibility}
                    </span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${p.isArchived ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}>
                      {p.isArchived ? "Archived" : "Active"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
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

      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={archiveTarget?.isArchived ? "Unarchive project" : "Archive project"}
        description={
          archiveTarget
            ? archiveTarget.isArchived
              ? `Restore "${archiveTarget.name}" to active projects?`
              : `Archive "${archiveTarget.name}"? You can restore it later.`
            : ""
        }
        confirmLabel={archiveTarget?.isArchived ? "Restore" : "Archive"}
        variant="destructive"
        onConfirm={() => {
          if (archiveTarget) archiveMutation.mutate({ id: archiveTarget.id, isArchived: !archiveTarget.isArchived });
        }}
        loading={archiveMutation.isPending}
      />
    </div>
  );
}
