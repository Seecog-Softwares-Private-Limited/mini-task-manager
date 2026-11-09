"use client";

import { useTilt } from "../hooks";
import { IconCheck } from "../icons";

const SIDEBAR_WIDTHS = ["72%", "85%", "68%", "90%", "75%"];
const TASK_WIDTHS = [
  ["65%", "40%"],
  ["80%", "35%"],
  ["55%", "45%"],
  ["70%", "30%"],
  ["60%", "50%"],
  ["75%", "38%"],
];
const SPARK_HEIGHTS = [6, 10, 8, 14, 11, 18, 15, 22];

function DashboardMockup() {
  return (
    <div className="lp-mockup">
      <div className="lp-mockup-chrome">
        <div className="flex gap-1.5" aria-hidden>
          <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        </div>
        <div className="ml-3 flex-1 rounded-md bg-background px-3 py-1 text-[11px] text-muted-foreground border border-border/60">
          app.opspick.com/dashboard
        </div>
        <div className="lp-avatar-stack" aria-hidden>
          <span>JD</span>
          <span>MK</span>
          <span>+5</span>
        </div>
      </div>
      <div className="p-5 sm:p-6">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3 hidden sm:block space-y-2.5">
            <div className="h-7 rounded-lg bg-primary/10" />
            {SIDEBAR_WIDTHS.map((w, i) => (
              <div key={i} className="h-5 rounded-md bg-muted/60" style={{ width: w }} />
            ))}
          </div>
          <div className="col-span-12 sm:col-span-9 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Active", val: "42", accent: "text-primary" },
                { label: "Done", val: "128", accent: "text-success" },
                { label: "Team", val: "12", accent: "text-primary" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-muted/30 p-3">
                  <div className="text-[11px] font-medium text-muted-foreground">{s.label}</div>
                  <div className={`text-xl font-semibold tabular-nums ${s.accent}`}>{s.val}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {["To do", "In progress", "Done"].map((col, ci) => (
                <div key={col} className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    <span className={`h-1.5 w-1.5 rounded-full ${ci === 0 ? "bg-slate-400" : ci === 1 ? "bg-amber-400" : "bg-emerald-400"}`} />
                    {col}
                  </div>
                  {TASK_WIDTHS.slice(ci * 2, ci * 2 + 2 + ci).map((widths, i) => (
                    <div key={i} className="rounded-lg border border-border bg-card p-2.5 shadow-sm">
                      <div className="h-2 rounded bg-border" style={{ width: widths[0] }} />
                      <div className="mt-1.5 h-1.5 rounded bg-muted" style={{ width: widths[1] }} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
              <div>
                <div className="text-[11px] font-medium text-muted-foreground">Velocity trend</div>
                <div className="text-sm font-semibold text-foreground">+24% this sprint</div>
              </div>
              <div className="lp-sparkline" aria-hidden>
                {SPARK_HEIGHTS.map((h, i) => (
                  <span key={i} style={{ height: `${h}px` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroMockup() {
  const tiltRef = useTilt(5);

  return (
    <div className="lp-mockup-tilt-wrap relative">
      <div ref={tiltRef} className="lp-mockup-tilt">
        <DashboardMockup />
      </div>

      <div className="lp-float-card lp-float-card-1 hidden sm:flex">
        <span className="lp-float-icon">
          <IconCheck className="h-3.5 w-3.5" />
        </span>
        Automation triggered
      </div>

      <div className="lp-float-card lp-float-card-2 hidden sm:flex">
        <span className="lp-float-icon lp-float-icon-primary">
          <IconCheck className="h-3.5 w-3.5" />
        </span>
        Sprint on track
      </div>
    </div>
  );
}
