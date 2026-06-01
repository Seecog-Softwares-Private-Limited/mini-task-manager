"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  fetchAdminOrganizations,
  fetchAdminOrganization,
  adminSetOrganizationPlan,
  adminSuspendOrganization,
  adminUnsuspendOrganization,
  adminDeleteOrganization,
  fetchPlansForAdmin,
  type AdminOrganizationListItem,
  type AdminOrganizationDetail,
} from "@/services/api/admin.api";
import { DeleteOrganizationDialog } from "@/components/admin/delete-organization-dialog";
import { useToast } from "@/components/ui/use-toast";
import { parseApiError } from "@/services/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Building2,
  Search,
  Ban,
  CheckCircle2,
  Crown,
  Users,
  FolderKanban,
  HardDrive,
  Loader2,
  Trash2,
} from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const isSuspended = status === "SUSPENDED";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        isSuspended ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      )}
    >
      {status}
    </span>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [orgPendingDelete, setOrgPendingDelete] = useState<AdminOrganizationListItem | null>(null);

  const listQuery = useQuery({
    queryKey: ["admin", "organizations", page, search, statusFilter],
    queryFn: () =>
      fetchAdminOrganizations({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter,
      }),
  });

  const detailQuery = useQuery({
    queryKey: ["admin", "organization", selectedId],
    queryFn: () => fetchAdminOrganization(selectedId!),
    enabled: !!selectedId,
  });

  const plansQuery = useQuery({
    queryKey: ["admin", "plans"],
    queryFn: fetchPlansForAdmin,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
  };

  const planMutation = useMutation({
    mutationFn: ({ orgId, planId }: { orgId: string; planId: string }) =>
      adminSetOrganizationPlan(orgId, planId),
    onSuccess: invalidate,
  });

  const suspendMutation = useMutation({
    mutationFn: ({ orgId, reason }: { orgId: string; reason?: string }) =>
      adminSuspendOrganization(orgId, reason),
    onSuccess: () => {
      setSuspendReason("");
      invalidate();
    },
  });

  const unsuspendMutation = useMutation({
    mutationFn: (orgId: string) => adminUnsuspendOrganization(orgId),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (orgId: string) => adminDeleteOrganization(orgId),
    onSuccess: (_data, orgId) => {
      const name = orgPendingDelete?.name ?? "Organization";
      setOrgPendingDelete(null);
      if (selectedId === orgId) setSelectedId(null);
      invalidate();
      toast({
        title: "Organization deleted",
        description: `"${name}" and all tenant data were permanently removed.`,
        variant: "success",
      });
    },
    onError: (err) => {
      toast({
        title: "Delete failed",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  function requestDelete(org: AdminOrganizationListItem) {
    setOrgPendingDelete(org);
  }

  const organizations = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;
  const detail = detailQuery.data;
  const plans = plansQuery.data ?? [];

  const selectedRow = useMemo(
    () => organizations.find((o) => o.id === selectedId) ?? null,
    [organizations, selectedId]
  );

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function openDetail(org: AdminOrganizationListItem) {
    setSelectedId(org.id);
    setSelectedPlanId("");
    setSuspendReason("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Organizations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View subscribers, usage, change plans, and suspend accounts.
        </p>
      </div>

      <Card className="border-[#E5E7EB] shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search name, slug, or owner email…"
                  className="pl-9"
                />
              </div>
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>
            <div className="flex gap-2">
              {(["ALL", "ACTIVE", "SUSPENDED"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? "default" : "outline"}
                  onClick={() => {
                    setStatusFilter(s);
                    setPage(1);
                  }}
                >
                  {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {listQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : organizations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium text-slate-900">No organizations found</p>
              <p className="text-sm text-muted-foreground">Try a different search or filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-slate-50/80 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Organization</th>
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Members</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => (
                    <tr
                      key={org.id}
                      onClick={() => openDetail(org)}
                      className={cn(
                        "cursor-pointer border-b border-[#E5E7EB]/80 transition-colors hover:bg-slate-50",
                        selectedId === org.id && "bg-blue-50/60"
                      )}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{org.name}</p>
                        <p className="text-xs text-muted-foreground">{org.slug}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{org.ownerName || "—"}</p>
                        <p className="text-xs text-muted-foreground">{org.ownerEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1">
                          <Crown className="h-3.5 w-3.5 text-amber-500" />
                          {org.planName ?? "None"}
                        </span>
                        {org.subscriptionStatus && (
                          <p className="text-xs text-muted-foreground">{org.subscriptionStatus}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">{org.memberCount}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={org.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(org.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          disabled={deleteMutation.isPending && deleteMutation.variables === org.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDelete(org);
                          }}
                        >
                          {deleteMutation.isPending && deleteMutation.variables === org.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#E5E7EB] px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page {meta.page} of {meta.totalPages} · {meta.total} total
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {(selectedRow || detail) && (
        <OrganizationDetailPanel
          detail={detail}
          selectedRow={selectedRow}
          isLoading={detailQuery.isLoading}
          plans={plans}
          selectedPlanId={selectedPlanId}
          onPlanChange={setSelectedPlanId}
          suspendReason={suspendReason}
          onSuspendReasonChange={setSuspendReason}
          onClose={() => setSelectedId(null)}
          onSetPlan={() => {
            if (!selectedId || !selectedPlanId) return;
            planMutation.mutate({ orgId: selectedId, planId: selectedPlanId });
          }}
          onSuspend={() => {
            if (!selectedId) return;
            suspendMutation.mutate({ orgId: selectedId, reason: suspendReason || undefined });
          }}
          onUnsuspend={() => {
            if (!selectedId) return;
            unsuspendMutation.mutate(selectedId);
          }}
          onDelete={() => {
            const row = selectedRow ?? detail;
            if (!row) return;
            requestDelete(row);
          }}
          isPlanPending={planMutation.isPending}
          isSuspendPending={suspendMutation.isPending}
          isUnsuspendPending={unsuspendMutation.isPending}
          isDeletePending={deleteMutation.isPending}
        />
      )}

      <DeleteOrganizationDialog
        organization={orgPendingDelete}
        open={!!orgPendingDelete}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setOrgPendingDelete(null);
        }}
        loading={deleteMutation.isPending}
        onConfirm={async (orgId) => {
          await deleteMutation.mutateAsync(orgId);
        }}
      />
    </div>
  );
}

function OrganizationDetailPanel({
  detail,
  selectedRow,
  isLoading,
  plans,
  selectedPlanId,
  onPlanChange,
  suspendReason,
  onSuspendReasonChange,
  onClose,
  onSetPlan,
  onSuspend,
  onUnsuspend,
  onDelete,
  isPlanPending,
  isSuspendPending,
  isUnsuspendPending,
  isDeletePending,
}: {
  detail?: AdminOrganizationDetail;
  selectedRow: AdminOrganizationListItem | null;
  isLoading: boolean;
  plans: { id: string; name: string; slug: string }[];
  selectedPlanId: string;
  onPlanChange: (id: string) => void;
  suspendReason: string;
  onSuspendReasonChange: (v: string) => void;
  onClose: () => void;
  onSetPlan: () => void;
  onSuspend: () => void;
  onUnsuspend: () => void;
  onDelete: () => void;
  isPlanPending: boolean;
  isSuspendPending: boolean;
  isUnsuspendPending: boolean;
  isDeletePending: boolean;
}) {
  const org = detail ?? selectedRow;
  if (!org) return null;

  const isSuspended = org.status === "SUSPENDED";
  const currentPlanId = detail?.planId ?? "";

  return (
    <Card className="border-[#E5E7EB] shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-[#E5E7EB] bg-white">
        <div>
          <CardTitle className="text-lg">{org.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{org.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={org.status} />
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 pt-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Overview</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Owner</dt>
              <dd className="font-medium">{org.ownerName}</dd>
              <dd className="text-xs text-muted-foreground">{org.ownerEmail}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Members</dt>
              <dd className="font-medium">{org.memberCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="font-medium">{org.planName ?? "None"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDate(org.createdAt)}</dd>
            </div>
          </dl>

          {isLoading && !detail ? (
            <Skeleton className="h-24 w-full" />
          ) : detail ? (
            <div className="grid grid-cols-3 gap-3">
              <UsagePill
                icon={Users}
                label="Users"
                current={detail.usage.users.current}
                limit={detail.usage.users.limit}
              />
              <UsagePill
                icon={FolderKanban}
                label="Projects"
                current={detail.usage.projects.current}
                limit={detail.usage.projects.limit}
              />
              <UsagePill
                icon={HardDrive}
                label="Storage GB"
                current={detail.usage.storageGb.current}
                limit={detail.usage.storageGb.limit}
              />
            </div>
          ) : null}

          {detail?.suspensionReason && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-100">
              Suspension reason: {detail.suspensionReason}
            </p>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-3 rounded-xl border border-[#E5E7EB] bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Change plan</h3>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedPlanId || currentPlanId}
              onChange={(e) => onPlanChange(e.target.value)}
            >
              <option value="">Select plan…</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.slug})
                </option>
              ))}
            </select>
            <Button
              className="w-full"
              disabled={!selectedPlanId || isPlanPending}
              onClick={onSetPlan}
            >
              {isPlanPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply plan override
            </Button>
            <p className="text-xs text-muted-foreground">
              Assigns plan without payment — for support comps or manual upgrades.
            </p>
          </div>

          <div className="space-y-3 rounded-xl border border-[#E5E7EB] bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Account status</h3>
            {isSuspended ? (
              <Button
                variant="outline"
                className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                disabled={isUnsuspendPending}
                onClick={onUnsuspend}
              >
                {isUnsuspendPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Unsuspend organization
              </Button>
            ) : (
              <>
                <Input
                  placeholder="Suspension reason (optional)"
                  value={suspendReason}
                  onChange={(e) => onSuspendReasonChange(e.target.value)}
                />
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={isSuspendPending}
                  onClick={onSuspend}
                >
                  {isSuspendPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Ban className="mr-2 h-4 w-4" />
                  )}
                  Suspend organization
                </Button>
              </>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-red-200 bg-red-50/40 p-4">
            <h3 className="text-sm font-semibold text-red-900">Danger zone</h3>
            <p className="text-xs text-red-800/80">
              Permanently deletes this tenant and all related data. User accounts with no other workspaces are removed too.
            </p>
            <Button
              variant="destructive"
              className="w-full"
              disabled={isDeletePending}
              onClick={onDelete}
            >
              {isDeletePending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete organization permanently
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UsagePill({
  icon: Icon,
  label,
  current,
  limit,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  current: number;
  limit: number | null;
}) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-slate-50/50 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-lg font-semibold text-slate-900">
        {current}
        {limit != null && <span className="text-sm font-normal text-muted-foreground"> / {limit}</span>}
      </p>
    </div>
  );
}
