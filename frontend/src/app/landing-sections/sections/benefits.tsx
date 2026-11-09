import { IconCheck } from "../icons";
import { AnimatedStat } from "./animated-stat";

const BENEFITS = [
  {
    stat: <AnimatedStat end={3} suffix="×" />,
    title: "Faster issue resolution",
    desc: "Streamlined workflows and recurring checklists help ops teams close issues three times faster.",
  },
  {
    stat: <AnimatedStat end={60} suffix="%" />,
    title: "Less time on compliance paperwork",
    desc: "Auto-generated evidence exports replace manual audit prep across every site.",
  },
  {
    stat: <AnimatedStat end={2} suffix=" min" />,
    title: "Time to first site live",
    desc: "Pick your industry, add your first site, and start logging issues in under two minutes.",
  },
];

const CHECKLIST = [
  "7 industry editions, one platform",
  "Multi-site visibility in one dashboard",
  "Compliance-ready evidence exports",
  "Recurring checklists with approvals",
  "Role-based access control",
  "Per-seat pricing that scales with your team",
];

export function BenefitsSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div className="lp-reveal">
            <span className="lp-section-label">Why OpsPick</span>
            <h2 className="lp-heading mt-4">
              Built for teams that{" "}
              <span className="gradient-text">run real-world operations</span>
            </h2>
            <p className="lp-body-lg mt-3 max-w-lg">
              Stop juggling spreadsheets, WhatsApp groups, and paper checklists. One workspace for every site, every industry, every audit.
            </p>
            <ul className="mt-7 space-y-2.5">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[0.9375rem] text-muted-foreground">
                  <IconCheck className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            {BENEFITS.map((benefit, i) => (
              <div
                key={benefit.title}
                className="lp-card lp-reveal p-5 flex gap-4 items-start"
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div className="text-2xl font-semibold tabular-nums gradient-text shrink-0 w-14">{benefit.stat}</div>
                <div>
                  <h3 className="text-[0.9375rem] font-semibold text-foreground mb-0.5">{benefit.title}</h3>
                  <p className="text-[0.875rem] text-muted-foreground leading-relaxed">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
