"use client";

import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildComparisonRows } from "@/lib/plan-display";
import type { PlanListItem, UserPlanSlug } from "@/services/api/user-plans.api";

const FEATURE_ROWS: { key: keyof ReturnType<typeof buildComparisonRows>[0]; label: string; boolean?: boolean }[] = [
  { key: "workspaces", label: "Workspaces" },
  { key: "members", label: "Members / workspace" },
  { key: "storage", label: "Storage" },
  { key: "auditLogs", label: "Audit logs", boolean: true },
  { key: "analytics", label: "Analytics", boolean: true },
  { key: "importExport", label: "Import / export", boolean: true },
  { key: "prioritySupport", label: "Priority support", boolean: true },
];

function CellValue({ value, isCurrent }: { value: string | boolean; isCurrent: boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check
        className={cn(
          "mx-auto h-3.5 w-3.5 transition-colors duration-200",
          isCurrent ? "text-amber-600/90" : "text-emerald-600/80"
        )}
      />
    ) : (
      <Minus className="mx-auto h-3.5 w-3.5 text-muted-foreground/35" />
    );
  }
  return (
    <span
      className={cn(
        "text-sm transition-colors duration-200",
        isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
      )}
    >
      {value}
    </span>
  );
}

export function PlanFeatureComparison({
  plans,
  currentPlan,
}: {
  plans: PlanListItem[];
  currentPlan: UserPlanSlug | null | undefined;
}) {
  const rows = buildComparisonRows(plans);
  if (rows.length === 0) return null;

  return (
    <section className="rounded-xl border border-border/50 bg-card/40">
      <div className="border-b border-border/40 px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight">Compare plans</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Feature limits across Free, Silver, and Gold.
        </p>
      </div>

      <div className="max-h-[min(420px,60vh)] overflow-auto">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
            <tr className="border-b border-border/50">
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                Feature
              </th>
              {rows.map((row) => {
                const isCurrent = row.slug === currentPlan;
                return (
                  <th
                    key={row.slug}
                    className={cn(
                      "px-4 py-3 text-center text-sm font-semibold transition-colors duration-200",
                      isCurrent && row.slug === "gold" && "text-amber-800/90 dark:text-amber-300/90",
                      isCurrent && row.slug !== "gold" && "text-foreground"
                    )}
                  >
                    {row.name}
                    {isCurrent && (
                      <span className="mt-0.5 block text-[10px] font-normal uppercase tracking-wide text-muted-foreground/70">
                        Current
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {FEATURE_ROWS.map((feature) => (
              <tr
                key={feature.label}
                className="border-b border-border/30 transition-colors duration-200 last:border-0 hover:bg-muted/20"
              >
                <td className="px-5 py-2.5 text-sm text-muted-foreground">{feature.label}</td>
                {rows.map((row) => {
                  const isCurrent = row.slug === currentPlan;
                  const value = row[feature.key];
                  return (
                    <td
                      key={`${row.slug}-${feature.label}`}
                      className={cn(
                        "px-4 py-2.5 text-center transition-colors duration-200",
                        isCurrent && "bg-amber-500/[0.04] dark:bg-amber-500/[0.06]"
                      )}
                    >
                      <CellValue value={value as string | boolean} isCurrent={isCurrent} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
