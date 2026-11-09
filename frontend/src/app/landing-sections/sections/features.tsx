import {
  IconMapPin,
  IconFileCheck,
  IconAutomation,
  IconLayers,
  IconShield,
  IconIntegration,
} from "../icons";
import { SpotlightCard } from "./spotlight-card";

const FEATURES = [
  {
    icon: IconMapPin,
    title: "Sites, outlets & issue tracking",
    desc: "Track every outlet, site, ward, or client location. Log issues, snags, tickets, or complaints — whatever your industry calls them.",
  },
  {
    icon: IconFileCheck,
    title: "Compliance evidence exports",
    desc: "One-click FSSAI hygiene logs, RERA progress evidence, NABH packs, or SLA reports — audit-ready whenever you need them.",
  },
  {
    icon: IconAutomation,
    title: "Recurring checklists & approvals",
    desc: "Schedule recurring inspections with built-in submit-and-review workflows, so nothing ships without sign-off.",
  },
  {
    icon: IconLayers,
    title: "Seven industry editions",
    desc: "The same engine, relabeled for your team instantly — Outlets for restaurants, Snags for construction, Wards for hospitals.",
  },
  {
    icon: IconShield,
    title: "Role-based access & audit trail",
    desc: "Organization-level permissions, audit logs, and per-seat billing keep every site's data secure and accountable.",
  },
  {
    icon: IconIntegration,
    title: "API-first, with Jira import",
    desc: "Full REST API and webhooks, plus a built-in Jira importer to bring existing projects over in minutes.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-28 lp-section-alt">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="lp-reveal mx-auto max-w-2xl text-center mb-14">
          <span className="lp-section-label">Features</span>
          <h2 className="lp-heading mt-4">Everything your operations need</h2>
          <p className="lp-body-lg mt-3">
            Purpose-built for real-world ops. Every feature designed to reduce friction and keep you audit-ready.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature, i) => (
            <SpotlightCard
              key={feature.title}
              className="lp-card lp-card-interactive lp-reveal p-6"
              style={{ transitionDelay: `${i * 0.06}s` }}
            >
              <div className="lp-icon-box mb-4">
                <feature.icon />
              </div>
              <h3 className="text-[1rem] font-semibold text-foreground mb-1.5">{feature.title}</h3>
              <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">{feature.desc}</p>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
}
