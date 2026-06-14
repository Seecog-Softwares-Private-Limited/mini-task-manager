"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/use-permissions";
import { useTenant } from "@/context/tenant-context";
import { usePlanOptional } from "@/context/plan-context";
import {
  fetchOrganization,
  fetchOrganizations,
  updateOrganization,
  deleteOrganization,
  checkSlugAvailable,
} from "@/services/api/organizations.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Building2,
  CreditCard,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Archive,
  ArchiveRestore,
  Trash2,
  Shield,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { OrgSettingsTabs } from "@/components/settings/org-settings-tabs";
import { WorkspaceAvatarPresetsPicker } from "@/components/workspaces/workspace-avatar-presets-picker";
import { parseApiError, isRateLimited } from "@/services/api/client";

const SLUG_REGEX = /^[a-z0-9-]+$/;

export default function WorkspaceSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canEditOrgSettings, isLoading: permsLoading } = usePermissions();
  const { orgId, setOrgId } = useTenant();
  const planContext = usePlanOptional();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [debouncedSlug, setDebouncedSlug] = useState("");
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const { data: org, isLoading } = useQuery({
    queryKey: ["organization", orgId ?? ""],
    queryFn: () => fetchOrganization(orgId!),
    enabled: !!orgId,
  });

  useEffect(() => {
    if (!org) return;
    setName(org.name);
    setSlug(org.slug);
    setLogoPreview(org.logoUrl ?? null);
  }, [org?.id, org?.name, org?.slug, org?.logoUrl]);

  useEffect(() => {
    if (!orgId || !org) return;
    debounceRef.current = setTimeout(() => {
      const t = slug.trim().toLowerCase();
      if (t && SLUG_REGEX.test(t)) setDebouncedSlug(t);
      else setDebouncedSlug("");
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [slug, orgId, org]);

  const { data: slugAvailability, isLoading: slugCheckLoading } = useQuery({
    queryKey: ["organizations", "slug-available", debouncedSlug, orgId],
    queryFn: () => checkSlugAvailable(debouncedSlug, orgId!),
    enabled: !!debouncedSlug && !!orgId && !!org,
    staleTime: 30_000,
  });

  const isOwner = org?.myRole?.toLowerCase() === "owner";

  const slugInvalid = slug.trim().length > 0 && !SLUG_REGEX.test(slug.trim().toLowerCase());
  const isSlugTaken = !!(debouncedSlug && !slugInvalid && slugAvailability?.available === false);

  const archiveMutation = useMutation({
    mutationFn: (isArchived: boolean) => updateOrganization(orgId!, { isArchived }),
    onSuccess: async (_data, isArchived) => {
      queryClient.invalidateQueries({ queryKey: ["organization", orgId!] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      if (isArchived && orgId) {
        const orgs = await queryClient.fetchQuery({ queryKey: ["organizations"], queryFn: fetchOrganizations });
        const others = (orgs as { id: string; isArchived?: boolean }[]).filter((o) => o.id !== orgId && !o.isArchived);
        if (others.length > 0) setOrgId(others[0].id);
        else setOrgId(null);
        router.refresh();
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteOrganization(orgId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      setOrgId(null);
      router.push("/dashboard/workspaces");
      router.refresh();
    },
  });

  const updateDetailsMutation = useMutation({
    mutationFn: (payload: { name?: string; slug?: string; logoUrl?: string }) =>
      updateOrganization(orgId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization", orgId!] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      router.refresh();
      router.push("/dashboard/workspaces");
    },
  });

  const hasChanges =
    !!org &&
    (name.trim() !== org.name ||
      slug.trim().toLowerCase() !== org.slug ||
      (isOwner && (logoPreview ?? "") !== (org.logoUrl ?? "")));

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    const maxSize = 100 * 1024;
    if (file.size > maxSize) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setLogoPreview(reader.result);
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

  function handleSaveDetails() {
    if (!org || !orgId) return;
    const payload: { name?: string; slug?: string; logoUrl?: string } = {};
    if (name.trim() !== org.name) payload.name = name.trim();
    if (slug.trim().toLowerCase() !== org.slug) payload.slug = slug.trim().toLowerCase();
    if (isOwner) {
      const before = org.logoUrl ?? "";
      const after = logoPreview ?? "";
      if (before !== after) {
        payload.logoUrl = after === "" ? "" : after;
      }
    }
    if (Object.keys(payload).length === 0) return;
    updateDetailsMutation.mutate(payload);
  }

  if (!orgId) {
    return (
      <div className="space-y-4 animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight">Workspace settings</h1>
        <Card className="max-w-md border-dashed border-2">
          <CardContent className="flex items-center gap-4 py-8 px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Select a workspace</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Choose a workspace to manage settings.</p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/dashboard/workspaces">Workspaces</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!permsLoading && !canEditOrgSettings) {
    return (
      <div className="space-y-4 animate-slide-up">
        <OrgSettingsTabs />
        <h1 className="text-2xl font-bold tracking-tight">Workspace settings</h1>
        <Card className="max-w-md border-dashed border-2">
          <CardContent className="flex items-center gap-4 py-8 px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 shrink-0">
              <Shield className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold">Access Restricted</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Only owners and admins can edit workspace settings.</p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href="/dashboard/settings">Back to Settings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subscriptionStatus = planContext?.subscription?.status ?? "—";
  const planName = planContext?.plan?.name ?? "—";

  const saveDisabled =
    !hasChanges ||
    !name.trim() ||
    slugInvalid ||
    isSlugTaken ||
    updateDetailsMutation.isPending;

  return (
    <div className="space-y-6 animate-slide-up">
      <OrgSettingsTabs />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Workspace</h1>
        <p className="mt-1 text-muted-foreground">Update name, URL slug, icon, and view subscription.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-11 w-full rounded-lg" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Workspace icon
                </Label>
                <div className="flex items-center gap-4">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-muted bg-muted/50">
                    {logoPreview ? (
                      <>
                        <img src={logoPreview} alt="" className="h-full w-full object-cover" />
                        {isOwner && (
                          <button
                            type="button"
                            onClick={clearLogo}
                            className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity hover:opacity-100"
                            aria-label="Remove icon"
                          >
                            Remove
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-lg font-semibold text-muted-foreground">
                        {getInitials(name) || "—"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    {isOwner ? (
                      <>
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                          <input
                            ref={logoFileInputRef}
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleLogoFile}
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
                {isOwner && (
                  <WorkspaceAvatarPresetsPicker value={logoPreview} onSelectPreset={selectPresetAvatar} />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Name
                </Label>
                <Input
                  id="org-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canEditOrgSettings}
                  placeholder="Workspace name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  URL slug
                </Label>
                <Input
                  id="org-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  disabled={!canEditOrgSettings}
                  placeholder="url-slug"
                  className={cn(
                    debouncedSlug &&
                      !slugInvalid &&
                      (isSlugTaken
                        ? "border-destructive focus-visible:ring-destructive"
                        : slugAvailability?.available === true
                          ? "border-emerald-500/50 focus-visible:ring-emerald-500/50"
                          : undefined)
                  )}
                />
                {slugInvalid && (
                  <p className="text-xs text-destructive">Lowercase letters, numbers, and hyphens only.</p>
                )}
                {debouncedSlug && !slugInvalid && (
                  <p className="text-xs">
                    {slugCheckLoading ? (
                      <span className="text-muted-foreground">Checking availability…</span>
                    ) : isSlugTaken ? (
                      <span className="text-destructive">This slug is already taken.</span>
                    ) : slugAvailability?.available === true ? (
                      <span className="text-emerald-600 dark:text-emerald-400">Slug is available.</span>
                    ) : null}
                  </p>
                )}
              </div>

              {canEditOrgSettings && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    onClick={handleSaveDetails}
                    disabled={saveDisabled}
                  >
                    {updateDetailsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </Button>
                  {updateDetailsMutation.isSuccess && !updateDetailsMutation.isPending && !hasChanges && (
                    <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</span>
                  )}
                </div>
              )}
              {updateDetailsMutation.error && (
                <p className="text-xs text-destructive">
                  {isRateLimited(updateDetailsMutation.error)
                    ? "Too many requests."
                    : parseApiError(updateDetailsMutation.error)}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-primary" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
            <span className="text-sm text-muted-foreground">Plan</span>
            <span className="text-sm font-semibold">{planName}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
            <span className="text-sm text-muted-foreground">Status</span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                subscriptionStatus?.toLowerCase() === "active"
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {subscriptionStatus}
            </span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/billing">
              Manage Billing <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {isOwner && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                {org?.isArchived ? <ArchiveRestore className="h-5 w-5 text-primary" /> : <Archive className="h-5 w-5 text-primary" />}
                Archive
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {org?.isArchived
                  ? "Restore this workspace to make it active again. It will reappear in your workspace list."
                  : "Archive this workspace to hide it from your active list. You can restore it later."}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => archiveMutation.mutate(!org?.isArchived)}
                disabled={archiveMutation.isPending}
              >
                {org?.isArchived ? (
                  <>
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                    Restore workspace
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive workspace
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Deleting the workspace will permanently remove all projects, tasks, members, and data. This action cannot be undone.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="mt-3"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete workspace
              </Button>
            </CardContent>
          </Card>

          <ConfirmDialog
            open={deleteConfirmOpen}
            onOpenChange={setDeleteConfirmOpen}
            title="Delete workspace?"
            description={`Are you sure you want to permanently delete "${org?.name}"? All projects, tasks, members, and data will be removed. This cannot be undone.`}
            confirmLabel="Delete permanently"
            variant="destructive"
            onConfirm={() => {
              deleteMutation.mutateAsync();
            }}
            loading={deleteMutation.isPending}
          />
        </>
      )}

      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link href="/dashboard/settings">
          <ArrowLeft className="mr-1 h-4 w-4" /> Settings
        </Link>
      </Button>
    </div>
  );
}
