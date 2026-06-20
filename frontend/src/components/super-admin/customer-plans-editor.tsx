"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { parseApiError } from "@/services/api/client";
import {
  updateSuperAdminPlanConfiguration,
  type UserPlanConfiguration,
} from "@/services/api/super-admin.api";
import { formatBytes, type UserPlanSlug } from "@/services/api/user-plans.api";
import { cn } from "@/lib/utils";
import { Building2, Crown, HardDrive, IndianRupee, Loader2, Save, Sparkles, Users } from "lucide-react";

type PlanMeta = {
  name: string;
  description: string;
  accent: string;
  icon: React.ReactNode;
};

const PLAN_META: Record<UserPlanSlug, PlanMeta> = {
  free: {
    name: "Free",
    description: "Default plan for new users on the landing page and dashboard.",
    accent: "border-slate-200 dark:border-slate-700",
    icon: <Sparkles className="h-5 w-5" />,
  },
  silver: {
    name: "Silver",
    description: "Mid-tier plan shown to customers upgrading from Free.",
    accent: "border-slate-300 dark:border-slate-600",
    icon: <Crown className="h-5 w-5" />,
  },
  gold: {
    name: "Gold",
    description: "Top tier with the highest workspace and member limits.",
    accent: "border-amber-300/80 dark:border-amber-600/60",
    icon: <Crown className="h-5 w-5 text-amber-600" />,
  },
};

function formatPriceLabel(planName: UserPlanSlug, priceMonthlyInr: number): string {
  if (planName === "free" || priceMonthlyInr <= 0) {
    return "₹0 / forever";
  }
  return `₹${priceMonthlyInr} / month`;
}

type PlanFormState = {
  priceMonthlyInr: string;
  maxUsers: string;
  unlimitedUsers: boolean;
  maxWorkspaces: string;
  unlimitedWorkspaces: boolean;
  maxStorageGb: string;
  allowCoupon: boolean;
};

function bytesToGb(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  return Number.isInteger(gb) ? String(gb) : gb.toFixed(2);
}

function configToFormFromConfig(
  config: UserPlanConfiguration,
  planName: UserPlanSlug
): PlanFormState {
  return {
    priceMonthlyInr: String(config.priceMonthlyInr ?? 0),
    maxUsers: config.maxUsers === null ? "" : String(config.maxUsers),
    unlimitedUsers: config.maxUsers === null,
    maxWorkspaces: config.maxWorkspaces === null ? "" : String(config.maxWorkspaces),
    unlimitedWorkspaces: config.maxWorkspaces === null,
    maxStorageGb: bytesToGb(config.maxStorage),
    allowCoupon: config.allowCoupon ?? (planName === "silver" || planName === "gold"),
  };
}

function PlanEditorCard({
  planName,
  config,
}: {
  planName: UserPlanSlug;
  config: UserPlanConfiguration;
}) {
  const meta = PLAN_META[planName];
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<PlanFormState>(() => configToFormFromConfig(config, planName));

  useEffect(() => {
    setForm(configToFormFromConfig(config, planName));
  }, [config, planName]);

  const preview = useMemo(() => {
    const priceMonthlyInr = parseInt(form.priceMonthlyInr, 10);
    const priceLine =
      planName === "free" || !Number.isFinite(priceMonthlyInr) || priceMonthlyInr <= 0
        ? "₹0 / forever"
        : `₹${priceMonthlyInr} / month`;
    const members = form.unlimitedUsers
      ? "Unlimited members per workspace"
      : `${form.maxUsers || "—"} members per workspace`;
    const workspaces = form.unlimitedWorkspaces
      ? "Unlimited workspaces"
      : `${form.maxWorkspaces || "—"} workspace${form.maxWorkspaces === "1" ? "" : "s"}`;
    const storageGb = parseFloat(form.maxStorageGb);
    const storageBytes = Number.isFinite(storageGb) ? storageGb * 1024 ** 3 : 0;
    const storage = storageBytes > 0 ? `${formatBytes(storageBytes)} storage` : "— storage";
    return [priceLine, workspaces, members, storage];
  }, [form, planName]);

  const mutation = useMutation({
    mutationFn: () => {
      const storageGb = parseFloat(form.maxStorageGb);
      if (!Number.isFinite(storageGb) || storageGb <= 0) {
        throw new Error("Storage must be a positive number (GB)");
      }
      const maxUsers = form.unlimitedUsers ? null : parseInt(form.maxUsers, 10);
      const maxWorkspaces = form.unlimitedWorkspaces ? null : parseInt(form.maxWorkspaces, 10);
      const priceMonthlyInr = planName === "free" ? 0 : parseInt(form.priceMonthlyInr, 10);
      if (planName !== "free" && (!Number.isFinite(priceMonthlyInr) || priceMonthlyInr < 0)) {
        throw new Error("Price must be zero or a positive whole number (INR)");
      }
      if (!form.unlimitedUsers && (!maxUsers || maxUsers < 1)) {
        throw new Error("Members per workspace must be at least 1, or enable Unlimited");
      }
      if (!form.unlimitedWorkspaces && (!maxWorkspaces || maxWorkspaces < 1)) {
        throw new Error("Workspaces must be at least 1, or enable Unlimited");
      }
      return updateSuperAdminPlanConfiguration(planName, {
        maxUsers,
        maxWorkspaces,
        maxStorage: Math.round(storageGb * 1024 ** 3),
        allowCoupon: planName === "free" ? false : form.allowCoupon,
        priceMonthlyInr,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["super-admin", "plans"] });
      toast({
        title: `${meta.name} plan updated`,
        description: "Customers will see the new limits and pricing on the website and in their dashboard.",
        variant: "success",
      });
    },
    onError: (err) => {
      toast({
        title: "Could not save plan",
        description: err instanceof Error ? err.message : parseApiError(err),
        variant: "error",
      });
    },
  });

  return (
    <Card className={cn("overflow-hidden", meta.accent)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              {meta.icon}
            </div>
            <div>
              <CardTitle className="text-lg">{meta.name}</CardTitle>
              <p className="text-sm font-medium text-primary">
                {formatPriceLabel(planName, parseInt(form.priceMonthlyInr, 10) || 0)}
              </p>
            </div>
          </div>
        </div>
        <CardDescription>{meta.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {planName !== "free" && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
              Price (INR / month)
            </Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={form.priceMonthlyInr}
              onChange={(e) => setForm((f) => ({ ...f, priceMonthlyInr: e.target.value }))}
              className="max-w-[140px]"
              placeholder="e.g. 500"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Workspaces
          </Label>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="number"
              min={1}
              disabled={form.unlimitedWorkspaces}
              value={form.maxWorkspaces}
              onChange={(e) => setForm((f) => ({ ...f, maxWorkspaces: e.target.value }))}
              className="max-w-[120px]"
              placeholder="e.g. 10"
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={form.unlimitedWorkspaces}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    unlimitedWorkspaces: e.target.checked,
                    maxWorkspaces: e.target.checked ? "" : f.maxWorkspaces,
                  }))
                }
                className="rounded border-input"
              />
              Unlimited
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            Members per workspace
          </Label>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="number"
              min={1}
              disabled={form.unlimitedUsers}
              value={form.maxUsers}
              onChange={(e) => setForm((f) => ({ ...f, maxUsers: e.target.value }))}
              className="max-w-[120px]"
              placeholder="e.g. 20"
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={form.unlimitedUsers}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    unlimitedUsers: e.target.checked,
                    maxUsers: e.target.checked ? "" : f.maxUsers,
                  }))
                }
                className="rounded border-input"
              />
              Unlimited
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            Storage (GB)
          </Label>
          <Input
            type="number"
            min={0.1}
            step={0.1}
            value={form.maxStorageGb}
            onChange={(e) => setForm((f) => ({ ...f, maxStorageGb: e.target.value }))}
            className="max-w-[140px]"
          />
        </div>

        {planName !== "free" && (
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Allow coupon codes</p>
              <p className="text-xs text-muted-foreground">
                Customers can apply discount codes when upgrading to {meta.name}
              </p>
            </div>
            <input
              type="checkbox"
              checked={form.allowCoupon}
              onChange={(e) => setForm((f) => ({ ...f, allowCoupon: e.target.checked }))}
              className="h-4 w-4 rounded border-input"
            />
          </div>
        )}

        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Customer preview
          </p>
          <ul className="space-y-1 text-sm text-foreground">
            {preview.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        </div>

        <Button
          className="w-full"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save {meta.name} plan
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export function CustomerPlansEditor({ configs }: { configs: UserPlanConfiguration[] }) {
  const ordered: UserPlanSlug[] = ["free", "silver", "gold"];
  const byPlan = new Map(configs.map((c) => [c.planName, c]));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {ordered.map((slug) => {
        const config = byPlan.get(slug);
        if (!config) return null;
        return <PlanEditorCard key={slug} planName={slug} config={config} />;
      })}
    </div>
  );
}
