"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSuperAdminCouponCode,
  deactivateSuperAdminCouponCode,
  fetchSuperAdminCouponCodes,
  setSuperAdminCouponActive,
} from "@/services/api/super-admin.api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { parseApiError } from "@/services/api/client";
import { Loader2, Plus, Ticket, Ban, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type PaidPlan = "silver" | "gold";

export default function SuperAdminCouponCodesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [discountPercent, setDiscountPercent] = useState("10");
  const [customCode, setCustomCode] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [applicablePlans, setApplicablePlans] = useState<PaidPlan[]>(["silver", "gold"]);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["super-admin", "coupon-codes"],
    queryFn: fetchSuperAdminCouponCodes,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const pct = parseInt(discountPercent, 10);
      if (!Number.isFinite(pct) || pct < 1 || pct > 99) {
        throw new Error("Discount must be between 1% and 99%");
      }
      if (applicablePlans.length === 0) {
        throw new Error("Select at least one plan (Silver or Gold)");
      }
      return createSuperAdminCouponCode({
        discountPercent: pct,
        applicablePlans,
        code: customCode.trim() || undefined,
        maxRedemptions: maxRedemptions ? parseInt(maxRedemptions, 10) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
    },
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ["super-admin", "coupon-codes"] });
      setCustomCode("");
      toast({
        title: "Coupon created",
        description: `Code ${created.code} — ${created.discountPercent}% off`,
        variant: "success",
      });
    },
    onError: (err) => {
      toast({
        title: "Could not create coupon",
        description: err instanceof Error ? err.message : parseApiError(err),
        variant: "error",
      });
    },
  });

  function togglePlan(plan: PaidPlan) {
    setApplicablePlans((prev) =>
      prev.includes(plan) ? prev.filter((p) => p !== plan) : [...prev, plan]
    );
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await setSuperAdminCouponActive(id, isActive);
      void queryClient.invalidateQueries({ queryKey: ["super-admin", "coupon-codes"] });
    } catch (err) {
      toast({
        title: "Update failed",
        description: parseApiError(err),
        variant: "error",
      });
    }
  }

  async function removeCoupon(id: string) {
    try {
      await deactivateSuperAdminCouponCode(id);
      void queryClient.invalidateQueries({ queryKey: ["super-admin", "coupon-codes"] });
      toast({ title: "Coupon deactivated", variant: "success" });
    } catch (err) {
      toast({
        title: "Could not deactivate",
        description: parseApiError(err),
        variant: "error",
      });
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Coupon Code</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate discount codes for Silver and Gold plans. Customers apply them when upgrading.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5" />
              Generate coupon
            </CardTitle>
            <CardDescription>
              Set discount % and which paid plans the code works on (10%–99% off).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Discount (%)</Label>
              <Input
                type="number"
                min={1}
                max={99}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Applies to plans</Label>
              <div className="flex flex-wrap gap-2">
                {(["silver", "gold"] as PaidPlan[]).map((plan) => (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => togglePlan(plan)}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                      applicablePlans.includes(plan)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {plan}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Custom code (optional)</Label>
              <Input
                placeholder="Auto-generated if empty"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              />
            </div>

            <div className="space-y-2">
              <Label>Max uses (optional)</Label>
              <Input
                type="number"
                min={1}
                placeholder="Unlimited"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Expires on (optional)</Label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Ticket className="mr-2 h-4 w-4" />
                  Generate coupon
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active coupons</CardTitle>
            <CardDescription>Share codes with customers for plan upgrades.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading coupons…</p>
            ) : coupons.length === 0 ? (
              <p className="text-sm text-muted-foreground">No coupons yet. Generate one on the left.</p>
            ) : (
              <div className="space-y-3">
                {coupons.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="rounded bg-muted px-2 py-1 text-sm font-bold tracking-wide">
                          {c.code}
                        </code>
                        <Badge variant={c.isActive ? "default" : "secondary"}>
                          {c.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <span className="text-sm font-semibold text-primary">
                          {c.discountPercent}% off
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Plans: {c.applicablePlans.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}
                        {" · "}
                        Used {c.redemptionCount}
                        {c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : " (unlimited)"}
                        {c.expiresAt
                          ? ` · Expires ${new Date(c.expiresAt).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {c.isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void toggleActive(c.id, false)}
                        >
                          <Ban className="mr-1 h-3.5 w-3.5" />
                          Pause
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void toggleActive(c.id, true)}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          Activate
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => void removeCoupon(c.id)}>
                        Deactivate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
