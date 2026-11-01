"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/context/tenant-context";
import { usePermissions } from "@/hooks/use-permissions";
import {
  fetchSites,
  createSite,
  updateSite,
  deleteSite,
  type CreateSitePayload,
} from "@/services/api/sites.api";
import { parseApiError } from "@/services/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SiteCreateEditModal,
  type SiteFormPayload,
} from "@/components/sites/site-create-edit-modal";
import type { Site } from "@/types/api";
import { MapPin, Plus, MoreHorizontal, Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";

export default function SitesPage() {
  const { orgId } = useTenant();
  const { isOwner, isAdmin, isLoading: permsLoading } = usePermissions();
  const canManage = isOwner || isAdmin;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingSite, setEditingSite] = React.useState<Site | null>(null);
  const [deletingSite, setDeletingSite] = React.useState<Site | null>(null);

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ["sites", orgId ?? ""],
    queryFn: fetchSites,
    enabled: !!orgId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["sites", orgId ?? ""] });

  const createMutation = useMutation({
    mutationFn: (payload: CreateSitePayload) => createSite(payload),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      toast({ title: "Site created", variant: "success" });
    },
    onError: (err) => {
      toast({ title: "Failed to create site", description: parseApiError(err), variant: "error" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateSitePayload> & { isArchived?: boolean } }) =>
      updateSite(id, payload),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      setEditingSite(null);
      toast({ title: "Site updated", variant: "success" });
    },
    onError: (err) => {
      toast({ title: "Failed to update site", description: parseApiError(err), variant: "error" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSite(id),
    onSuccess: () => {
      invalidate();
      setDeletingSite(null);
      toast({ title: "Site deleted", variant: "default" });
    },
    onError: (err) => {
      toast({ title: "Failed to delete site", description: parseApiError(err), variant: "error" });
    },
  });

  const handleSubmit = (payload: SiteFormPayload) => {
    if (editingSite) {
      updateMutation.mutate({ id: editingSite.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openCreate = () => {
    setEditingSite(null);
    setModalOpen(true);
  };

  const openEdit = (site: Site) => {
    setEditingSite(site);
    setModalOpen(true);
  };

  const toggleArchive = (site: Site) => {
    updateMutation.mutate({ id: site.id, payload: { isArchived: !site.isArchived } });
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sites</h1>
          <p className="mt-1 text-muted-foreground">
            Physical locations — branches, wards, campuses — that projects, tasks and issues can be tied to.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="shrink-0 gap-1.5">
            <Plus className="h-4 w-4" /> New site
          </Button>
        )}
      </div>

      {isLoading || permsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : sites.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">No sites yet</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {canManage
                  ? "Add your first site to start linking projects and issues to a location."
                  : "An owner or admin hasn't added any sites yet."}
              </p>
            </div>
            {canManage && (
              <Button onClick={openCreate} size="sm" className="mt-2 gap-1.5">
                <Plus className="h-4 w-4" /> New site
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <Card key={site.id} className={site.isArchived ? "opacity-60" : undefined}>
              <CardContent className="flex items-start justify-between gap-3 p-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="truncate font-semibold">{site.name}</p>
                  </div>
                  {site.address && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{site.address}</p>
                  )}
                  {site.isArchived && (
                    <Badge variant="statusArchived" className="mt-2">
                      Archived
                    </Badge>
                  )}
                </div>
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(site)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleArchive(site)}>
                        {site.isArchived ? (
                          <>
                            <ArchiveRestore className="mr-2 h-4 w-4" /> Unarchive
                          </>
                        ) : (
                          <>
                            <Archive className="mr-2 h-4 w-4" /> Archive
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeletingSite(site)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SiteCreateEditModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditingSite(null);
        }}
        site={editingSite}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        error={
          createMutation.error
            ? parseApiError(createMutation.error)
            : updateMutation.error
              ? parseApiError(updateMutation.error)
              : null
        }
      />

      <ConfirmDialog
        open={!!deletingSite}
        onOpenChange={(open) => !open && setDeletingSite(null)}
        title="Delete site?"
        description={`"${deletingSite?.name ?? ""}" will be permanently removed. Projects and issues linked to it will keep their history but lose the site reference.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deletingSite) deleteMutation.mutate(deletingSite.id);
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
