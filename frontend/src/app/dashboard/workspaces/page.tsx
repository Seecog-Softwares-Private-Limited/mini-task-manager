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
import { fetchOrgMemberCount, fetchOrgMembers } from "@/services/api/members.api";
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
  Plus,
  ArrowRight,
  ImagePlus,
  Pencil,
  Shield,
} from "lucide-react";
import { OrganizationPreviewDrawer } from "@/components/organizations/organization-preview-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { WorkspaceAvatarPresetsPicker } from "@/components/workspaces/workspace-avatar-presets-picker";
import { LogoCropModal } from "@/components/workspaces/logo-crop-modal";
import { WorkspaceFilterChips } from "@/components/workspaces/workspace-filter-chips";
import { WorkspaceEmptyState } from "@/components/workspaces/workspace-empty-state";
import { WorkspaceCard } from "@/components/workspaces/workspace-card";
import type { Organization } from "@/types/api";
import { cn, getInitials, nameToSlug } from "@/lib/utils";
import { PendingWorkspaceInvitations } from "@/components/members/pending-workspace-invitations";

const schema = z.object({
  name: z.string().min(1).max(150),
  slug: z.string().min(1).max(150).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
});

type FormData = z.infer<typeof schema>;
type FilterType = "all" | "active" | "archived";

export default function WorkspacesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { orgId, setOrgId } = useTenant();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  /** When set, the same modal as "New workspace" opens pre-filled for editing. */
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const workspaceModalOpen = createModalOpen || !!editingOrg;
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
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
  const memberPreviewQueries = useQueries({
    queries: organizations.map((org) => ({
      queryKey: ["org-members-preview", org.id],
      queryFn: () => fetchOrgMembers(org.id),
      enabled: organizations.length > 0,
      staleTime: 120_000,
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

  const isEditingOrgOwner = editingOrg?.myRole?.toLowerCase() === "owner";

  const hasEditChanges = useMemo(() => {
    if (!editingOrg) return true;
    return (
      watchedName.trim() !== editingOrg.name ||
      watchedSlug.trim().toLowerCase() !== editingOrg.slug ||
      (isEditingOrgOwner && (logoPreview ?? "") !== (editingOrg.logoUrl ?? ""))
    );
  }, [editingOrg, watchedName, watchedSlug, logoPreview, isEditingOrgOwner]);

  function onSubmit(values: FormData) {
    if (editingOrg) {
      const payload: { name?: string; slug?: string; logoUrl?: string } = {};
      if (values.name.trim() !== editingOrg.name) payload.name = values.name.trim();
      const newSlug = values.slug.trim().toLowerCase();
      if (newSlug !== editingOrg.slug) payload.slug = newSlug;
      if (isEditingOrgOwner) {
        const before = editingOrg.logoUrl ?? "";
        const after = logoPreview ?? "";
        if (before !== after) {
          payload.logoUrl = after === "" ? "" : after;
        }
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
    if (!file?.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setCropSrc(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function clearLogo() {
    setLogoPreview(null);
    if (logoFileInputRef.current) logoFileInputRef.current.value = "";
  }

  function selectPresetAvatar(dataUrl: string) {
    setCropSrc(dataUrl);
  }

  return (
    <div className="w-full space-y-8 animate-slide-up">
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
          className="h-9 w-full rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 px-4 text-sm font-medium text-white shadow-[0_4px_14px_-4px_rgba(109,40,217,0.55)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_6px_18px_-4px_rgba(109,40,217,0.6)] sm:w-auto sm:shrink-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Workspace
        </Button>
      </div>

      <PendingWorkspaceInvitations />

      {/* Metrics bar + workspace card grid */}
      <div>
        {organizations.length > 0 && (
          <WorkspaceFilterChips
            filter={filter}
            onChange={setFilter}
            totalCount={totalCount}
            activeCount={activeCount}
            archivedCount={archivedCount}
          />
        )}
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">
          {organizations.length > 0 ? "Your workspaces" : "Get started"}
        </h2>
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {organizations.length === 0 && !isLoading ? (
            <WorkspaceEmptyState
              variant="none"
              onCreate={() => {
                setEditingOrg(null);
                setCreateModalOpen(true);
              }}
            />
          ) : isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="min-h-[180px] overflow-hidden rounded-xl border-[#E7EAF0] bg-[#FCFCFD] dark:border-border dark:bg-card/50">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4 rounded-md" />
                        <Skeleton className="h-3 w-1/2 rounded-md" />
                        <div className="flex gap-1.5">
                          <Skeleton className="h-5 w-14 rounded-full" />
                          <Skeleton className="h-5 w-14 rounded-full" />
                        </div>
                        <div className="flex gap-1.5">
                          <Skeleton className="h-6 w-20 rounded-md" />
                          <Skeleton className="h-6 w-20 rounded-md" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredOrgs.length === 0 ? (
              <WorkspaceEmptyState
                variant={filter === "archived" ? "archived" : "active"}
                onShowAll={() => setFilter("all")}
              />
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

                return (
                  <WorkspaceCard
                    key={org.id}
                    org={org}
                    isCurrent={isCurrent}
                    memberCount={memberCount}
                    memberCountLoading={memberCountQueries[idx]?.isLoading ?? false}
                    memberPreview={memberPreviewQueries[idx]?.data ?? []}
                    memberPreviewLoading={memberPreviewQueries[idx]?.isLoading ?? false}
                    projectCount={projectCount}
                    projectCountLoading={projectsCountQueries[idx]?.isLoading ?? false}
                    planLabel={planLabel}
                    planBadgeClass={planBadgeClass}
                    lastActivityAt={lastActivityQueries[idx]?.data ?? null}
                    lastActivityLoading={lastActivityQueries[idx]?.isLoading ?? false}
                    healthData={orgHealthQueries[idx]?.data ?? null}
                    healthLoading={orgHealthQueries[idx]?.isLoading ?? false}
                    archivePending={archiveMutation.isPending}
                    deletePending={deleteMutation.isPending}
                    canEdit={canEditWorkspace(org)}
                    onOpen={() => {
                      setOrgId(org.id);
                      setPreviewOrg(org);
                      router.refresh();
                    }}
                    onPreview={() => setPreviewOrg(org)}
                    onSettings={() => {
                      setOrgId(org.id);
                      router.push("/dashboard/settings/workspace");
                    }}
                    onInvite={() => {
                      setOrgId(org.id);
                      router.push("/dashboard/settings/members");
                    }}
                    onEdit={() => openEditWorkspace(org)}
                    onArchive={() => archiveMutation.mutate({ orgId: org.id, isArchived: !org.isArchived })}
                    onDelete={() => {
                      setOrgId(org.id);
                      setOrgPendingDelete(org);
                    }}
                    onProjects={() => {
                      setOrgId(org.id);
                      router.push("/dashboard/projects");
                    }}
                    onBilling={() => {
                      setOrgId(org.id);
                      router.push("/dashboard/billing");
                    }}
                  />
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
            setCropSrc(null);
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
              {editingOrg ? "Edit workspace" : "Create workspace"}
            </DialogTitle>
            <DialogDescription>
              {editingOrg
                ? "Update name, URL slug, and icon. Subscription and danger zone stay under Settings → Workspace."
                : "Create a new workspace to collaborate with your team."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Logo: upload + preset avatars */}
            {(() => {
              const canChangeLogo = !editingOrg || isEditingOrgOwner;
              return (
                <div className="space-y-3">
                  <Label>Workspace icon</Label>
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-muted bg-muted/50">
                      {logoPreview ? (
                        <>
                          <img src={logoPreview} alt="Logo preview" className="h-full w-full object-cover" />
                          {canChangeLogo && (
                            <button
                              type="button"
                              onClick={clearLogo}
                              className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity hover:opacity-100"
                              aria-label="Remove logo"
                            >
                              <span className="text-xs font-medium">Remove</span>
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-lg font-semibold text-muted-foreground">
                          {getInitials(watch("name")) || "—"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      {canChangeLogo ? (
                        <>
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
                        </>
                      ) : (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Shield className="h-3.5 w-3.5 shrink-0" />
                          Only the workspace owner can change the icon.
                        </p>
                      )}
                    </div>
                  </div>
                  {canChangeLogo && (
                    <WorkspaceAvatarPresetsPicker value={logoPreview} onSelectPreset={selectPresetAvatar} />
                  )}
                </div>
              );
            })()}
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
                  setCropSrc(null);
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

      <LogoCropModal
        open={!!cropSrc}
        imageSrc={cropSrc ?? ""}
        onConfirm={(cropped) => {
          setLogoPreview(cropped);
          setCropSrc(null);
        }}
        onCancel={() => setCropSrc(null)}
      />
    </div>
  );
}
