import {
  IconKanban,
  IconAutomation,
  IconTeam,
  IconChart,
  IconShield,
  IconIntegration,
} from "../icons";

const FEATURES = [
  {
    icon: IconKanban,
    title: "Kanban & Scrum boards",
    desc: "Drag-and-drop boards with customizable columns, WIP limits, and swimlanes. Switch views instantly.",
  },
  {
    icon: IconAutomation,
    title: "Smart automations",
    desc: "Auto-notify stakeholders, update statuses, and log time when tasks move — zero manual overhead.",
  },
  {
    icon: IconTeam,
    title: "Real-time collaboration",
    desc: "@mentions, comments, and live activity feeds keep everyone aligned without another status meeting.",
  },
  {
    icon: IconChart,
    title: "Advanced analytics",
    desc: "Velocity charts, burndown graphs, and cycle time tracking turn data into actionable decisions.",
  },
  {
    icon: IconShield,
    title: "Enterprise security",
    desc: "Role-based access, API key management, audit logs, and organization-level controls from day one.",
  },
  {
    icon: IconIntegration,
    title: "API-first integrations",
    desc: "Full REST API with key management. Connect your tools and build custom workflows programmatically.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-28 lp-section-alt">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="lp-reveal mx-auto max-w-2xl text-center mb-14">
          <span className="lp-section-label">Features</span>
          <h2 className="lp-heading mt-4">Everything you need to ship</h2>
          <p className="lp-body-lg mt-3">
            Purpose-built for modern teams. Every feature designed to reduce friction and multiply output.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className="lp-card lp-card-interactive lp-reveal p-6"
              style={{ transitionDelay: `${i * 0.06}s` }}
            >
              <div className="lp-icon-box mb-4">
                <feature.icon />
              </div>
              <h3 className="text-[1rem] font-semibold text-foreground mb-1.5">{feature.title}</h3>
              <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
