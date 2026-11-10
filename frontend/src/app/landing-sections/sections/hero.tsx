import Link from "next/link";
import { IconArrowRight, IconCheck } from "../icons";
import { HeroMockup } from "./hero-mockup";

export function HeroSection() {
  return (
    <section className="relative lp-hero-bg overflow-hidden">
      <div className="absolute inset-0 lp-grid-bg pointer-events-none" aria-hidden />
      <div className="lp-orb lp-orb-1" aria-hidden />
      <div className="lp-orb lp-orb-2" aria-hidden />
      <div className="lp-orb lp-orb-3" aria-hidden />
      <div className="lp-grain" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8 pt-28 pb-20 sm:pt-32 sm:pb-24 lg:pt-36">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <div className="lp-animate-in lp-delay-1 flex justify-center lg:justify-start">
              <span className="lp-eyebrow">
                <span className="lp-eyebrow-dot">
                  <IconCheck className="h-3 w-3" />
                </span>
                Built for 7 industries, out of the box
              </span>
            </div>

            <h1 className="lp-display lp-animate-in lp-delay-1 mt-5">
              Operations management, tuned to{" "}
              <span className="gradient-text">your industry</span>
            </h1>

            <p className="lp-body-lg lp-animate-in lp-delay-2 mt-5 max-w-lg mx-auto lg:mx-0">
              From restaurant outlets to construction sites to hospital wards — OpsPick tracks tasks, issues, and compliance evidence in the language your team already speaks.
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
              {["Free forever plan", "7 industry editions", "Cancel anytime"].map((item) => (
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

        <div className="lp-animate-in lp-delay-5 lp-hero-stats mt-16 sm:mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
          {[
            { value: "7", label: "Industry editions" },
            { value: "<2 min", label: "To your first site live" },
            { value: "24/7", label: "Compliance evidence, ready" },
            { value: "₹0", label: "To start, forever" },
          ].map((stat) => (
            <div key={stat.label} className="text-center lg:text-left">
              <p className="lp-hero-stat-value">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
