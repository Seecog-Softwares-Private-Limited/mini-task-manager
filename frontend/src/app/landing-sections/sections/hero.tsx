import Link from "next/link";
import { IconArrowRight, IconCheck } from "../icons";
import { HeroMockup } from "./hero-mockup";

export function HeroSection() {
  return (
    <section className="relative lp-hero-bg overflow-hidden">
      <div className="absolute inset-0 lp-grid-bg pointer-events-none" aria-hidden />
      <div className="lp-orb lp-orb-1" aria-hidden />
      <div className="lp-orb lp-orb-2" aria-hidden />
      <div className="lp-grain" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8 pt-28 pb-20 sm:pt-32 sm:pb-24 lg:pt-36">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <div className="lp-animate-in lp-delay-1 flex justify-center lg:justify-start">
              <span className="lp-eyebrow">
                <span className="lp-eyebrow-dot">
                  <IconCheck className="h-3 w-3" />
                </span>
                Trusted by fast-moving teams
              </span>
            </div>

            <h1 className="lp-display lp-animate-in lp-delay-1 mt-5">
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
            <HeroMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
