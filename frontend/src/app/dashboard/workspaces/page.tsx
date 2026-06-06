"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import {
  fetchOrganizations,
  createOrganization,
  checkSlugAvailable,
  updateOrganization,
  deleteOrganization,
  fetchOrgHealthData,
} from "@/services/api/organizations.api";
import { fetchProjectsCountByOrg } from "@/services/api/projects.api";
import { fetchOrgMemberCount } from "@/services/api/members.api";
import { fetchSubscriptionByOrg, fetchPlans } from "@/services/api/billing.api";
import { fetchLastActivityByOrg } from "@/services/api/activity-logs.api";
import { useTenant } from "@/context/tenant-context";
import { parseApiError, isRateLimited } from "@/services/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Plus,
  Check,
  ArrowRight,
  Users,
  FolderKanban,
  Clock,
  ImagePlus,
  Settings,
  CreditCard,
  Archive,
  ArchiveRestore,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { OrganizationPreviewDrawer } from "@/components/organizations/organization-preview-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { WorkspaceAvatarPresetsPicker } from "@/components/workspaces/workspace-avatar-presets-picker";
import type { Organization } from "@/types/api";
import { cn, formatRelativeTime, isWithinLast24h, getInitials, nameToSlug } from "@/lib/utils";
import { PendingWorkspaceInvitations } from "@/components/members/pending-workspace-invitations";

const schema = z.object({
  name: z.string().min(1).max(150),
  slug: z.string().min(1).max(150).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
});

type FormData = z.infer<typeof schema>;
type FilterType = "all" | "active" | "archived";

type OrgHealth = "healthy" | "at-risk" | "critical";

/** Derive org health from overdue count, total tasks, and last activity. */
function orgHealthFromData(
  overdueCount: number,
  totalTasks: number,
  lastActivityAt: string | null | undefined
): OrgHealth {
  const hasRecentActivity = isWithinLast24h(lastActivityAt ?? undefined);
  if (totalTasks === 0) return "healthy";
  if (overdueCount >= 3) return "critical";
  if (overdueCount >= 1 || (overdueCount === 0 && !hasRecentActivity && totalTasks > 0)) return "at-risk";
  return "healthy";
}

function OrgHealthDot({
  health,
  loading,
  label,
}: {
  health: OrgHealth;
  loading?: boolean;
  label?: string;
}) {
  if (loading) {
    return (
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted animate-pulse"
        aria-hidden
      />
    );
  }
  const dotClass = {
    healthy: "bg-[hsl(var(--success))]",
    "at-risk": "bg-[hsl(var(--warning))]",
    critical: "bg-destructive",
  }[health];
  const ariaLabel = label ?? `Workspace health: ${health}`;
  return (
    <span
      className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotClass)}
      role="status"
      aria-label={ariaLabel}
      title={ariaLabel}
    />
  );
}

export default function WorkspacesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { orgId, setOrgId } = useTenant();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  /** When set, the same modal as "New workspace" opens pre-filled for editing. */
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const workspaceModalOpen = createModalOpen || !!editingOrg;
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [debouncedSlug, setDebouncedSlug] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [previewOrg, setPreviewOrg] = useState<Organization | null>(null);
  const [orgPendingDelete, setOrgPendingDelete] = useState<Organization | null>(null);
  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: fetchOrganizations,
  });
  const { data: plans = [] } = useQuery({
    queryKey: ["billing", "plans"],
    queryFn: fetchPlans,
  });

  const memberCountQueries = useQueries({
    queries: organizations.map((org) => ({
      queryKey: ["org-member-count", org.id],
      queryFn: () => fetchOrgMemberCount(org.id),
      enabled: organizations.length > 0,
    })),
  });
  const projectsCountQueries = useQueries({
    queries: organizations.map((org) => ({
      queryKey: ["projects", org.id, "count"],
      queryFn: () => fetchProjectsCountByOrg(org.id),
      enabled: organizations.length > 0,
    })),
  });
  const subscriptionQueries = useQueries({
    queries: organizations.map((org) => ({
      queryKey: ["billing", "subscription", org.id],
      queryFn: () => fetchSubscriptionByOrg(org.id),
      enabled: organizations.length > 0,
    })),
  });
  const lastActivityQueries = useQueries({
    queries: organizations.map((org) => ({
      queryKey: ["activity-logs", "last", org.id],
      queryFn: () => fetchLastActivityByOrg(org.id),
      enabled: organizations.length > 0,
    })),
  });
  const orgHealthQueries = useQueries({
    queries: organizations.map((org) => ({
      queryKey: ["org-health", org.id],
      queryFn: () => fetchOrgHealthData(org.id),
      enabled: organizations.length > 0,
      staleTime: 30_000,
      refetchInterval: 60_000,
    })),
  });

  const createOrgMutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: (org) => {
      setOrgId(org.id);
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
      reset();
      setLogoPreview(null);
      if (logoFileInputRef.current) logoFileInputRef.current.value = "";
      setCreateModalOpen(false);
      setEditingOrg(null);
    },
  });

  const updateOrgMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { name?: string; slug?: string; logoUrl?: string };
    }) => updateOrganization(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
      reset();
      setLogoPreview(null);
      if (logoFileInputRef.current) logoFileInputRef.current.value = "";
      setSlugManuallyEdited(false);
      setDebouncedSlug("");
      setCreateModalOpen(false);
      setEditingOrg(null);
      router.refresh();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ orgId: id, isArchived }: { orgId: string; isArchived: boolean }) =>
      updateOrganization(id, { isArchived }),
    onSuccess: (_updated, { orgId: archivedOrgId, isArchived }) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
      queryClient.invalidateQueries({ queryKey: ["org-health", archivedOrgId] });
      if (isArchived && archivedOrgId === orgId) {
        const others = organizations.filter((o) => o.id !== archivedOrgId && !o.isArchived);
        if (others.length > 0) setOrgId(others[0].id);
        else setOrgId(null);
        router.refresh();
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOrganization(id),
    onSuccess: async (_data, deletedId) => {
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
      setOrgPendingDelete(null);
      if (deletedId === orgId) {
        const orgs = await queryClient.fetchQuery({
          queryKey: ["organizations"],
          queryFn: fetchOrganizations,
        });
        const others = orgs.filter((o) => o.id !== deletedId);
        if (others.length > 0) setOrgId(others[0].id);
        else setOrgId(null);
        router.refresh();
      }
    },
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "" },
  });

  const name = watch("name");
  const slug = watch("slug");

  // Auto-generate slug from name when creating only (not when editing)
  useEffect(() => {
    if (!workspaceModalOpen || editingOrg) return;
    if (slugManuallyEdited) return;
    const generated = nameToSlug(name);
    if (generated) setValue("slug", generated);
  }, [name, workspaceModalOpen, editingOrg, slugManuallyEdited, setValue]);

  // Pre-fill form when opening edit modal
  useEffect(() => {
    if (!editingOrg) return;
    reset({
      name: editingOrg.name,
      slug: editingOrg.slug,
    });
    setLogoPreview(editingOrg.logoUrl ?? null);
    setSlugManuallyEdited(true);
    if (logoFileInputRef.current) logoFileInputRef.current.value = "";
  }, [editingOrg?.id, reset]);

  // Debounce slug for availability check
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!workspaceModalOpen) return;
    debounceRef.current = setTimeout(() => {
      const trimmed = slug.trim().toLowerCase();
      if (trimmed && /^[a-z0-9-]+$/.test(trimmed)) {
        setDebouncedSlug(trimmed);
      } else {
        setDebouncedSlug("");
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [slug, workspaceModalOpen]);

  const { data: slugAvailability, isLoading: slugCheckLoading } = useQuery({
    queryKey: ["organizations", "slug-available", debouncedSlug, editingOrg?.id ?? "new"],
    queryFn: () => checkSlugAvailable(debouncedSlug, editingOrg?.id),
    enabled: !!debouncedSlug && workspaceModalOpen,
    staleTime: 30_000,
  });

  const watchedName = watch("name");
  const watchedSlug = watch("slug");
  const hasEditChanges = useMemo(() => {
    if (!editingOrg) return true;
    return (
      watchedName.trim() !== editingOrg.name ||
      watchedSlug.trim().toLowerCase() !== editingOrg.slug ||
      (logoPreview ?? "") !== (editingOrg.logoUrl ?? "")
    );
  }, [editingOrg, watchedName, watchedSlug, logoPreview]);

  function onSubmit(values: FormData) {
    if (editingOrg) {
      const payload: { name?: string; slug?: string; logoUrl?: string } = {};
      if (values.name.trim() !== editingOrg.name) payload.name = values.name.trim();
      const newSlug = values.slug.trim().toLowerCase();
      if (newSlug !== editingOrg.slug) payload.slug = newSlug;
      const before = editingOrg.logoUrl ?? "";
      const after = logoPreview ?? "";
      if (before !== after) {
        payload.logoUrl = after === "" ? "" : after;
      }
      if (Object.keys(payload).length === 0) return;
      updateOrgMutation.mutate({ id: editingOrg.id, payload });
      return;
    }
    createOrgMutation.mutate({
      ...values,
      slug: values.slug.trim().toLowerCase(),
      logoUrl: logoPreview ?? undefined,
    });
  }

  const isSlugTaken = !!(debouncedSlug && slugAvailability?.available === false);

  function canEditWorkspace(org: Organization) {
    const r = org.myRole?.toLowerCase() ?? "";
    return r === "owner" || r === "admin";
  }

  function openEditWorkspace(org: Organization) {
    if (!canEditWorkspace(org)) return;
    setCreateModalOpen(false);
    setEditingOrg(org);
  }

  const totalCount = organizations.length;
  const activeCount = organizations.filter((o) => !o.isArchived).length;
  const archivedCount = organizations.filter((o) => o.isArchived).length;
  const filteredOrgs =
    filter === "archived"
      ? organizations.filter((o) => o.isArchived)
      : filter === "active"
        ? organizations.filter((o) => !o.isArchived)
        : organizations;

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setLogoPreview(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      return;
    }
    const maxSize = 100 * 1024; // 100KB
    if (file.size > maxSize) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setLogoPreview(result);
      }
    };
    reader.readAsDataURL(file);
  }

  function clearLogo() {
    setLogoPreview(null);
    if (logoFileInputRef.current) logoFileInputRef.current.value = "";
  }

  function selectPresetAvatar(dataUrl: string) {
    setLogoPreview(dataUrl);
    if (logoFileInputRef.current) logoFileInputRef.current.value = "";
  }

  return (
    <div className="space-y-10 animate-slide-up">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[2rem] font-semibold tracking-[-0.02em] text-slate-900 dark:text-foreground">Workspaces</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Select a workspace to work in, or create a new one.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingOrg(null);
            setCreateModalOpen(true);
          }}
          size="sm"
          className="h-10 w-full rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 text-white shadow-[0_10px_24px_-14px_rgba(109,40,217,0.65)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 sm:h-9 sm:w-auto sm:shrink-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Workspace
        </Button>
      </div>

      <PendingWorkspaceInvitations />

      {/* Metrics bar + workspace card grid */}
      <div>
        {organizations.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200",
                filter === "all"
                  ? "border-violet-200 bg-violet-500/10 text-violet-700 shadow-sm dark:border-violet-500/40 dark:text-violet-300"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-border dark:bg-card dark:text-muted-foreground"
              )}
            >
              <span className="tabular-nums">{totalCount}</span>
              <span className="ml-1.5">Total</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter("active")}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200",
                filter === "active"
                  ? "border-violet-200 bg-violet-500/10 text-violet-700 shadow-sm dark:border-violet-500/40 dark:text-violet-300"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-border dark:bg-card dark:text-muted-foreground"
              )}
            >
              <span className="tabular-nums">{activeCount}</span>
              <span className="ml-1.5">Active</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter("archived")}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200",
                filter === "archived"
                  ? "border-violet-200 bg-violet-500/10 text-violet-700 shadow-sm dark:border-violet-500/40 dark:text-violet-300"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-border dark:bg-card dark:text-muted-foreground"
              )}
            >
              <span className="tabular-nums">{archivedCount}</span>
              <span className="ml-1.5">Archived</span>
            </button>
          </div>
        )}
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {organizations.length > 0 ? "Your workspaces" : "Get started"}
        </h2>
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
          {organizations.length === 0 && !isLoading ? (
            <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300/70 bg-white/70 py-16 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-border/60 dark:bg-muted/10">
              <Building2 className="mb-3 h-12 w-12 text-muted-foreground/60" />
              <p className="text-sm font-medium text-muted-foreground">No workspaces yet</p>
              <p className="mt-1 text-xs text-muted-foreground/80">Create your first workspace to get started.</p>
              <Button
                onClick={() => {
                  setEditingOrg(null);
                  setCreateModalOpen(true);
                }}
                size="sm"
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Workspace
              </Button>
            </div>
          ) : isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="overflow-hidden rounded-2xl border-[#E7EAF0] bg-[#FCFCFD] dark:border-border dark:bg-card/50">
                  <CardContent className="p-7 md:p-8">
                    <div className="flex items-start gap-6">
                      <Skeleton className="h-20 w-20 shrink-0 rounded-2xl md:h-[5.5rem] md:w-[5.5rem]" />
                      <div className="flex-1 space-y-3">
                        <Skeleton className="h-6 w-3/4 rounded-lg" />
                        <Skeleton className="h-4 w-1/2 rounded-lg" />
                        <Skeleton className="h-4 w-full rounded-lg" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredOrgs.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300/70 bg-white/70 py-16 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-border/60 dark:bg-muted/10">
                <Building2 className="mb-3 h-12 w-12 text-muted-foreground/60" />
                <p className="text-sm font-medium text-muted-foreground">
                  {filter === "archived" ? "No archived workspaces" : "No active workspaces"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/80">
                  {filter === "archived" ? "Archived workspaces will appear here." : "All workspaces are archived."}
                </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setFilter("all")}>
                  Show all
                </Button>
              </div>
            ) : (
              filteredOrgs.map((org) => {
                const idx = organizations.findIndex((o) => o.id === org.id);
                const isCurrent = orgId === org.id;
                const memberCount = memberCountQueries[idx]?.data ?? 0;
                const projectCount = projectsCountQueries[idx]?.data ?? 0;
                const subscription = subscriptionQueries[idx]?.data ?? null;
                const plan = subscription?.planId
                  ? plans.find((p) => p.id === subscription.planId)
                  : null;
                const planLabel = plan?.name ?? "Free";
                const planBadgeClass =
                  /enterprise/i.test(planLabel)
                    ? "badge-plan-enterprise"
                    : /pro/i.test(planLabel)
                      ? "badge-plan-pro"
                      : "badge-plan-free";
                const roleLabel = org.myRole
                  ? (org.myRole.charAt(0).toUpperCase() + org.myRole.slice(1).toLowerCase())
                  : null;
                const roleBadgeClass =
                  /owner/i.test(org.myRole ?? "")
                    ? "badge-role-owner"
                    : /admin/i.test(org.myRole ?? "")
                      ? "badge-role-admin"
                      : "badge-role-member";
                const memberCountLoading = memberCountQueries[idx]?.isLoading;
                const projectCountLoading = projectsCountQueries[idx]?.isLoading;
                const lastActivityAt = lastActivityQueries[idx]?.data ?? null;
                const lastActivityLoading = lastActivityQueries[idx]?.isLoading;
                const lastActivityRelative = formatRelativeTime(lastActivityAt ?? undefined);
                const activityRecent = isWithinLast24h(lastActivityAt ?? undefined);
                const healthData = orgHealthQueries[idx]?.data ?? null;
                const healthLoading = orgHealthQueries[idx]?.isLoading ?? false;
                const overdueCount = healthData?.overdueCount ?? 0;
                const totalTasks = healthData?.totalTasks ?? 0;
                const orgHealth = orgHealthFromData(overdueCount, totalTasks, lastActivityAt);

                return (
                  <Card
                    key={org.id}
                    role="button"
                    tabIndex={0}
                    aria-current={isCurrent ? "true" : undefined}
                    className={cn(
                      "group/card relative cursor-pointer overflow-hidden rounded-2xl border border-[#E7EAF0] bg-[#FCFCFD]/95 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_20px_45px_-28px_rgba(15,23,42,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(15,23,42,0.06),0_24px_48px_-24px_rgba(15,23,42,0.3)] active:scale-[0.998] dark:border-border dark:bg-card/60",
                      "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
                      "outline-none",
                      isCurrent
                        ? "border-violet-300 bg-violet-500/[0.06] ring-1 ring-violet-300/70 dark:border-violet-500/50 dark:bg-violet-500/[0.12]"
                        : "hover:border-violet-200/80 dark:hover:border-violet-500/35",
                      org.isArchived && "opacity-75"
                    )}
                    onClick={() => {
                      setOrgId(org.id);
                      setPreviewOrg(org);
                      router.refresh();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOrgId(org.id);
                        setPreviewOrg(org);
                        router.refresh();
                      }
                    }}
                  >
                    <CardContent className="relative p-5 sm:p-6 md:p-8">
                      <div className="flex items-start gap-4 sm:gap-5 md:gap-6">
                        {/* Logo / workspace icon */}
                        <div
                          className={cn(
                            "flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl ring-1 ring-black/[0.04] transition-colors sm:h-20 sm:w-20 md:h-[5.5rem] md:w-[5.5rem]",
                            isCurrent ? "gradient-bg text-white shadow-md shadow-primary/25 md:shadow-lg" : "bg-slate-100 text-slate-700 dark:bg-muted"
                          )}
                        >
                          {org.logoUrl ? (
                            <img src={org.logoUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-lg font-bold tracking-tight md:text-xl">
                              {getInitials(org.name)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          {/* Name row: health dot + name (no overlap) */}
                          <div className="flex items-center gap-2.5">
                            <OrgHealthDot
                              health={orgHealth}
                              loading={healthLoading}
                              label={`${orgHealth}: ${overdueCount} overdue${totalTasks > 0 ? `, ${totalTasks} tasks` : ""}`}
                            />
                            <p className="min-w-0 flex-1 truncate text-xl font-semibold tracking-[-0.01em] text-slate-900 dark:text-foreground">
                              {org.name}
                            </p>
                          </div>
                          {/* Badges row: Plan, Role, Active - no overlap */}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold md:text-xs",
                                planBadgeClass
                              )}
                            >
                              {planLabel}
                            </span>
                            {roleLabel && (
                              <span
                                className={cn(
                                  "inline-flex shrink-0 items-center rounded-md px-2 py-1 text-[11px] font-medium uppercase tracking-wide md:text-xs",
                                  roleBadgeClass
                                )}
                              >
                                {roleLabel}
                              </span>
                            )}
                            {isCurrent && (
                              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary md:text-xs">
                                <Check className="h-3.5 w-3.5" />
                                Active Workspace
                              </span>
                            )}
                          </div>
                          {/* Slug */}
                          <p className="mt-1.5 text-sm text-muted-foreground break-all sm:truncate">{org.slug}</p>

                          {/* Stats row */}
                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                            <span className="flex items-center gap-2">
                              <Users className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400 md:h-5 md:w-5" aria-hidden />
                              {memberCountLoading ? "…" : (
                                <span className="tabular-nums">{memberCount} member{memberCount !== 1 ? "s" : ""}</span>
                              )}
                            </span>
                            <span className="flex items-center gap-2">
                              <FolderKanban className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400 md:h-5 md:w-5" aria-hidden />
                              {projectCountLoading ? "…" : (
                                <span className="tabular-nums">{projectCount} project{projectCount !== 1 ? "s" : ""}</span>
                              )}
                            </span>
                          </div>

                          {/* Footer: activity + hover action buttons */}
                          <div className="mt-4 min-w-0 space-y-2">
                            <p
                              className={cn(
                                "truncate text-sm leading-snug",
                                lastActivityLoading && "text-muted-foreground/50",
                                !lastActivityLoading && activityRecent
                                  ? "font-medium text-primary/90"
                                  : "text-muted-foreground/80"
                              )}
                            >
                              <Clock
                                className={cn(
                                  "mr-1.5 inline h-4 w-4 -translate-y-0.5 md:h-5 md:w-5",
                                  lastActivityLoading && "text-muted-foreground/50",
                                  !lastActivityLoading && activityRecent
                                    ? "text-amber-500 dark:text-amber-400"
                                    : "text-slate-500 dark:text-slate-400"
                                )}
                                aria-hidden
                              />
                              {lastActivityLoading ? "…" : lastActivityRelative ? `Active ${lastActivityRelative}` : "No activity"}
                            </p>
                            {/* Hover-only action buttons — wrap inside card width */}
                            <div
                              className="hidden max-w-full flex-wrap items-center justify-end gap-0.5 opacity-0 translate-y-0.5 transition-all duration-200 group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100 sm:flex"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 rounded-lg text-cyan-600 hover:bg-cyan-500/15 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 md:h-9 md:w-9"
                                onClick={() => setPreviewOrg(org)}
                                title="Preview"
                                aria-label="Preview workspace"
                              >
                                <Eye className="h-4 w-4 md:h-5 md:w-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 rounded-lg text-violet-600 hover:bg-violet-500/15 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 md:h-9 md:w-9"
                                onClick={() => { setOrgId(org.id); router.push("/dashboard/projects"); }}
                                title="Projects"
                                aria-label="Open projects"
                              >
                                <FolderKanban className="h-4 w-4 md:h-5 md:w-5" />
                              </Button>
                              {canEditWorkspace(org) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 rounded-lg text-amber-600 hover:bg-amber-500/15 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 md:h-9 md:w-9"
                                  onClick={() => openEditWorkspace(org)}
                                  title="Edit workspace"
                                  aria-label="Edit workspace"
                                >
                                  <Pencil className="h-4 w-4 md:h-5 md:w-5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 rounded-lg text-slate-600 hover:bg-slate-500/15 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100 md:h-9 md:w-9"
                                onClick={() => { setOrgId(org.id); router.push("/dashboard/settings"); }}
                                title="Settings"
                                aria-label="Open settings"
                              >
                                <Settings className="h-4 w-4 md:h-5 md:w-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 rounded-lg text-emerald-600 hover:bg-emerald-500/15 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 md:h-9 md:w-9"
                                onClick={() => { setOrgId(org.id); router.push("/dashboard/billing"); }}
                                title="Billing"
                                aria-label="Billing"
                              >
                                <CreditCard className="h-4 w-4 md:h-5 md:w-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 rounded-lg text-blue-600 hover:bg-blue-500/15 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 md:h-9 md:w-9"
                                onClick={() => { setOrgId(org.id); archiveMutation.mutate({ orgId: org.id, isArchived: !org.isArchived }); }}
                                disabled={archiveMutation.isPending}
                                title={org.isArchived ? "Restore" : "Archive"}
                                aria-label={org.isArchived ? "Restore workspace" : "Archive workspace"}
                              >
                                {org.isArchived ? (
                                  <ArchiveRestore className="h-4 w-4 md:h-5 md:w-5" />
                                ) : (
                                  <Archive className="h-4 w-4 md:h-5 md:w-5" />
                                )}
                              </Button>
                              {org.myRole?.toLowerCase() === "owner" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 rounded-lg text-red-600 hover:bg-red-500/15 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 md:h-9 md:w-9"
                                  onClick={() => { setOrgId(org.id); setOrgPendingDelete(org); }}
                                  disabled={deleteMutation.isPending}
                                  title="Delete workspace"
                                  aria-label="Delete workspace"
                                >
                                  <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Mobile action row (always visible on touch devices) */}
                          <div
                            className="mt-3 flex flex-wrap items-center gap-2 sm:hidden"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="sm"
                              className="h-8 rounded-lg px-3 text-xs"
                              onClick={() => {
                                setOrgId(org.id);
                                setPreviewOrg(org);
                                router.refresh();
                              }}
                            >
                              Open
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-lg px-3 text-xs"
                              onClick={() => setPreviewOrg(org)}
                            >
                              Preview
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-lg px-3 text-xs"
                              onClick={() => {
                                setOrgId(org.id);
                                router.push("/dashboard/projects");
                              }}
                            >
                              Projects
                            </Button>
                          </div>

                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

      <OrganizationPreviewDrawer
        organization={previewOrg}
        open={!!previewOrg}
        onOpenChange={(open) => !open && setPreviewOrg(null)}
        onNavigate={(id) => setOrgId(id)}
        plans={plans}
      />

      <ConfirmDialog
        open={!!orgPendingDelete}
        onOpenChange={(open) => {
          if (!open) setOrgPendingDelete(null);
        }}
        title="Delete workspace?"
        description={
          orgPendingDelete
            ? `Permanently delete “${orgPendingDelete.name}”? All projects, tasks, members, and data will be removed. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete permanently"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          if (orgPendingDelete) await deleteMutation.mutateAsync(orgPendingDelete.id);
        }}
      />

      {/* Create / edit workspace — same modal */}
      <Dialog
        open={workspaceModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateModalOpen(false);
            setEditingOrg(null);
            reset();
            setLogoPreview(null);
            if (logoFileInputRef.current) logoFileInputRef.current.value = "";
            setSlugManuallyEdited(false);
            setDebouncedSlug("");
          }
        }}
      >
        <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg" data-cy={editingOrg ? "edit-workspace-modal" : "create-workspace-modal"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  editingOrg ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-primary/10 text-primary"
                )}
              >
                {editingOrg ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </div>
              {editingOrg ? "Edit workspace" : "New Workspace"}
            </DialogTitle>
            <DialogDescription>
              {editingOrg
                ? "Update name, URL slug, and icon. Subscription and danger zone stay under Settings → Workspace."
                : "Create a new workspace to collaborate with your team."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Logo: upload + preset avatars */}
            <div className="space-y-3">
              <Label>Workspace icon</Label>
              <div className="flex items-center gap-4">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-muted bg-muted/50">
                  {logoPreview ? (
                    <>
                      <img src={logoPreview} alt="Logo preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={clearLogo}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity hover:opacity-100"
                        aria-label="Remove logo"
                      >
                        <span className="text-xs font-medium">Remove</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-lg font-semibold text-muted-foreground">
                      {getInitials(watch("name")) || "—"}
                    </span>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleLogoChange}
                    />
                    <ImagePlus className="h-4 w-4" />
                    <span>{logoPreview ? "Change" : "Upload"} image</span>
                  </label>
                  <p className="text-xs text-muted-foreground/80">PNG, JPG up to 100KB. Optional.</p>
                </div>
              </div>
              <WorkspaceAvatarPresetsPicker value={logoPreview} onSelectPreset={selectPresetAvatar} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-name">Name</Label>
              <Input id="modal-name" {...register("name")} placeholder="Acme Inc" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="modal-slug">URL Slug</Label>
                {slugManuallyEdited && name && (
                  <button
                    type="button"
                    onClick={() => {
                      setValue("slug", nameToSlug(name));
                      setSlugManuallyEdited(false);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Sync from name
                  </button>
                )}
              </div>
              <Input
                id="modal-slug"
                {...register("slug", {
                  onChange: () => setSlugManuallyEdited(true),
                })}
                placeholder="acme-inc"
                className={cn(
                  debouncedSlug &&
                    (slugAvailability?.available === false
                      ? "border-destructive focus-visible:ring-destructive"
                      : slugAvailability?.available === true
                        ? "border-emerald-500/50 focus-visible:ring-emerald-500/50"
                        : undefined)
                )}
              />
              {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
              {debouncedSlug && !errors.slug && (
                <p className="text-xs">
                  {slugCheckLoading ? (
                    <span className="text-muted-foreground">Checking availability…</span>
                  ) : slugAvailability?.available === false ? (
                    <span className="text-destructive">This slug is already taken.</span>
                  ) : slugAvailability?.available === true ? (
                    <span className="text-emerald-600 dark:text-emerald-400">Slug is available.</span>
                  ) : null}
                </p>
              )}
            </div>
            {createOrgMutation.error && !editingOrg && (
              <p className="text-xs text-destructive">
                {isRateLimited(createOrgMutation.error) ? "Too many requests." : parseApiError(createOrgMutation.error)}
              </p>
            )}
            {updateOrgMutation.error && editingOrg && (
              <p className="text-xs text-destructive">
                {isRateLimited(updateOrgMutation.error) ? "Too many requests." : parseApiError(updateOrgMutation.error)}
              </p>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateModalOpen(false);
                  setEditingOrg(null);
                  reset();
                  setLogoPreview(null);
                  if (logoFileInputRef.current) logoFileInputRef.current.value = "";
                  setSlugManuallyEdited(false);
                  setDebouncedSlug("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createOrgMutation.isPending ||
                  updateOrgMutation.isPending ||
                  isSlugTaken ||
                  !!(editingOrg && (!hasEditChanges || !watchedName.trim()))
                }
              >
                {createOrgMutation.isPending || updateOrgMutation.isPending ? (
                  editingOrg ? "Saving…" : "Creating…"
                ) : editingOrg ? (
                  "Save changes"
                ) : (
                  <span className="flex items-center gap-2">
                    Create <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
