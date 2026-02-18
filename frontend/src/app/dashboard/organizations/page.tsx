"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import { fetchOrganizations, createOrganization, checkSlugAvailable, updateOrganization, fetchOrgHealthData } from "@/services/api/organizations.api";
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
import { Building2, Plus, Check, ArrowRight, Users, FolderKanban, Clock, ImagePlus, Settings, CreditCard, Archive, ArchiveRestore, Eye } from "lucide-react";
import { OrganizationPreviewDrawer } from "@/components/organizations/organization-preview-drawer";
import type { Organization } from "@/types/api";
import { cn, formatRelativeTime, isWithinLast24h, getInitials, nameToSlug } from "@/lib/utils";

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
  const ariaLabel = label ?? `Organization health: ${health}`;
  return (
    <span
      className={cn("h-2 w-2 shrink-0 rounded-full", dotClass)}
      role="status"
      aria-label={ariaLabel}
      title={ariaLabel}
    />
  );
}

export default function OrganizationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { orgId, setOrgId } = useTenant();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [debouncedSlug, setDebouncedSlug] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [previewOrg, setPreviewOrg] = useState<Organization | null>(null);
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

  const mutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: (org) => {
      setOrgId(org.id);
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      reset();
      setLogoPreview(null);
      setCreateModalOpen(false);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ orgId: id, isArchived }: { orgId: string; isArchived: boolean }) =>
      updateOrganization(id, { isArchived }),
    onSuccess: (_updated, { orgId: archivedOrgId, isArchived }) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["org-health", archivedOrgId] });
      if (isArchived && archivedOrgId === orgId) {
        const others = organizations.filter((o) => o.id !== archivedOrgId && !o.isArchived);
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

  // Auto-generate slug from name (unless manually edited)
  useEffect(() => {
    if (!createModalOpen) return;
    if (slugManuallyEdited) return;
    const generated = nameToSlug(name);
    if (generated) setValue("slug", generated);
  }, [name, createModalOpen, slugManuallyEdited, setValue]);

  // Debounce slug for availability check
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!createModalOpen) return;
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
  }, [slug, createModalOpen]);

  const { data: slugAvailability, isLoading: slugCheckLoading } = useQuery({
    queryKey: ["organizations", "slug-available", debouncedSlug],
    queryFn: () => checkSlugAvailable(debouncedSlug),
    enabled: !!debouncedSlug && createModalOpen,
    staleTime: 30_000,
  });

  function onSubmit(values: FormData) {
    mutation.mutate({
      ...values,
      slug: values.slug.trim().toLowerCase(),
      logoUrl: logoPreview ?? undefined,
    });
  }

  const isSlugTaken = debouncedSlug && slugAvailability?.available === false;

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
      if (typeof result === "string") setLogoPreview(result);
    };
    reader.readAsDataURL(file);
  }

  function clearLogo() {
    setLogoPreview(null);
  }

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="mt-1 text-muted-foreground">
            Select an organization to work in, or create a new one.
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} size="sm" className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          New Organization
        </Button>
      </div>

      {/* Metrics bar + Organization card grid */}
      <div>
        {organizations.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                filter === "all"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="tabular-nums">{totalCount}</span>
              <span className="ml-1.5">Total</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter("active")}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                filter === "active"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="tabular-nums">{activeCount}</span>
              <span className="ml-1.5">Active</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter("archived")}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                filter === "archived"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="tabular-nums">{archivedCount}</span>
              <span className="ml-1.5">Archived</span>
            </button>
          </div>
        )}
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {organizations.length > 0 ? "Your Organizations" : "Get Started"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {organizations.length === 0 && !isLoading ? (
            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/25 bg-muted/5 py-16 text-center">
              <Building2 className="mb-3 h-12 w-12 text-muted-foreground/60" />
              <p className="text-sm font-medium text-muted-foreground">No organizations yet</p>
              <p className="mt-1 text-xs text-muted-foreground/80">Create your first organization to get started.</p>
              <Button onClick={() => setCreateModalOpen(true)} size="sm" className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                New Organization
              </Button>
            </div>
          ) : isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4 rounded" />
                        <Skeleton className="h-4 w-1/2 rounded" />
                        <Skeleton className="h-4 w-full rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredOrgs.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/25 bg-muted/5 py-16 text-center">
                <Building2 className="mb-3 h-12 w-12 text-muted-foreground/60" />
                <p className="text-sm font-medium text-muted-foreground">
                  {filter === "archived" ? "No archived organizations" : "No active organizations"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/80">
                  {filter === "archived" ? "Archived organizations will appear here." : "All organizations are archived."}
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
                      "group/card relative cursor-pointer transition-all duration-200 hover:shadow-premium",
                      "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
                      "outline-none",
                      isCurrent
                        ? "border-2 border-primary bg-primary/[0.06] dark:bg-primary/[0.1] shadow-glow shadow-premium"
                        : "hover:border-primary/20",
                      org.isArchived && "opacity-75"
                    )}
                    onClick={() => {
                      setOrgId(org.id);
                      router.refresh();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOrgId(org.id);
                        router.refresh();
                      }
                    }}
                  >
                    <CardContent className="relative p-5">
                      <div className="flex items-start gap-4">
                        {/* Logo */}
                        <div
                          className={cn(
                            "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl transition-colors",
                            isCurrent ? "gradient-bg text-white shadow-md shadow-primary/20" : "bg-muted"
                          )}
                        >
                          {org.logoUrl ? (
                            <img src={org.logoUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-sm font-semibold">
                              {getInitials(org.name)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          {/* Name row: health dot + name (no overlap) */}
                          <div className="flex items-center gap-2">
                            <OrgHealthDot
                              health={orgHealth}
                              loading={healthLoading}
                              label={`${orgHealth}: ${overdueCount} overdue${totalTasks > 0 ? `, ${totalTasks} tasks` : ""}`}
                            />
                            <p className="min-w-0 flex-1 truncate font-semibold">{org.name}</p>
                          </div>
                          {/* Badges row: Plan, Role, Active - no overlap */}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                planBadgeClass
                              )}
                            >
                              {planLabel}
                            </span>
                            {roleLabel && (
                              <span
                                className={cn(
                                  "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                                  roleBadgeClass
                                )}
                              >
                                {roleLabel}
                              </span>
                            )}
                            {isCurrent && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                <Check className="h-3 w-3" />
                                Active Workspace
                              </span>
                            )}
                          </div>
                          {/* Slug */}
                          <p className="mt-1 text-xs text-muted-foreground truncate">{org.slug}</p>

                          {/* Stats row */}
                          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              {memberCountLoading ? "…" : (
                                <span className="tabular-nums">{memberCount} member{memberCount !== 1 ? "s" : ""}</span>
                              )}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <FolderKanban className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              {projectCountLoading ? "…" : (
                                <span className="tabular-nums">{projectCount} project{projectCount !== 1 ? "s" : ""}</span>
                              )}
                            </span>
                          </div>

                          {/* Footer: activity + hover action buttons */}
                          <div className="mt-2.5 flex items-center justify-between gap-2">
                            <p
                              className={cn(
                                "min-w-0 flex-1 truncate text-[11px] leading-none",
                                lastActivityLoading && "text-muted-foreground/50",
                                !lastActivityLoading && activityRecent
                                  ? "font-medium text-primary/90"
                                  : "text-muted-foreground/80"
                              )}
                            >
                              <Clock className="mr-1 inline h-3 w-3 -translate-y-px opacity-70" />
                              {lastActivityLoading ? "…" : lastActivityRelative ? `Active ${lastActivityRelative}` : "No activity"}
                            </p>
                            {/* Hover-only action buttons - right-aligned, never overlap name */}
                            <div
                              className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover/card:opacity-100 group-focus-within/card:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={() => setPreviewOrg(org)}
                                title="Preview"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={() => { setOrgId(org.id); router.push("/dashboard/projects"); }}
                                title="Manage"
                              >
                                <FolderKanban className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={() => { setOrgId(org.id); router.push("/dashboard/settings"); }}
                                title="Settings"
                              >
                                <Settings className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={() => { setOrgId(org.id); router.push("/dashboard/billing"); }}
                                title="Billing"
                              >
                                <CreditCard className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={() => { setOrgId(org.id); archiveMutation.mutate({ orgId: org.id, isArchived: !org.isArchived }); }}
                                disabled={archiveMutation.isPending}
                                title={org.isArchived ? "Restore" : "Archive"}
                              >
                                {org.isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
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

      {/* Create organization modal */}
      <Dialog
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) {
            reset();
            setLogoPreview(null);
            setSlugManuallyEdited(false);
            setDebouncedSlug("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Plus className="h-4 w-4" />
              </div>
              New Organization
            </DialogTitle>
            <DialogDescription>
              Create a new organization to collaborate with your team.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Logo upload + preview */}
            <div className="space-y-2">
              <Label>Logo</Label>
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
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleLogoChange}
                    />
                    <ImagePlus className="h-4 w-4" />
                    <span>{logoPreview ? "Change" : "Upload"} logo</span>
                  </label>
                  <p className="text-xs text-muted-foreground/80">PNG, JPG up to 100KB. Optional.</p>
                </div>
              </div>
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
            {mutation.error && (
              <p className="text-xs text-destructive">
                {isRateLimited(mutation.error) ? "Too many requests." : parseApiError(mutation.error)}
              </p>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending || isSlugTaken}>
                {mutation.isPending ? "Creating..." : (
                  <span className="flex items-center gap-2">Create <ArrowRight className="h-3.5 w-3.5" /></span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
