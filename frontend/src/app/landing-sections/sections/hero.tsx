import Link from "next/link";
import { IconArrowRight, IconCheck } from "../icons";

const SIDEBAR_WIDTHS = ["72%", "85%", "68%", "90%", "75%"];
const TASK_WIDTHS = [
  ["65%", "40%"],
  ["80%", "35%"],
  ["55%", "45%"],
  ["70%", "30%"],
  ["60%", "50%"],
  ["75%", "38%"],
];

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
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative lp-hero-bg overflow-hidden">
      <div className="absolute inset-0 lp-grid-bg pointer-events-none" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8 pt-28 pb-20 sm:pt-32 sm:pb-24 lg:pt-36">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <h1 className="lp-display lp-animate-in lp-delay-1">
              Project management{" "}
              <span className="gradient-text">built for speed</span>
            </h1>

            <p className="lp-body-lg lp-animate-in lp-delay-2 mt-5 max-w-lg mx-auto lg:mx-0">
              Kanban boards, sprints, automations, and real-time collaboration — everything your team needs to ship faster.
            </p>

            <div className="lp-animate-in lp-delay-3 mt-8 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3">
              <Link href="/signup" className="lp-btn-primary px-6 py-3 text-base w-full sm:w-auto">
                Start free — no credit card
                <IconArrowRight className="h-4 w-4" />
              </Link>
              <a href="#how-it-works" className="lp-btn-secondary px-6 py-3 text-base w-full sm:w-auto">
                See how it works
              </a>
            </div>

            <div className="lp-animate-in lp-delay-4 mt-7 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {["Free forever plan", "Setup in 2 minutes", "Cancel anytime"].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <IconCheck className="h-3.5 w-3.5 text-success" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="lp-animate-in lp-delay-5">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
