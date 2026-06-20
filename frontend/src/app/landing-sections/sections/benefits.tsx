import { IconCheck } from "../icons";

const BENEFITS = [
  {
    stat: "3×",
    title: "Faster task completion",
    desc: "Streamlined workflows and automations help teams complete work three times faster.",
  },
  {
    stat: "60%",
    title: "Less meeting time",
    desc: "Real-time visibility and async collaboration eliminate constant status syncs.",
  },
  {
    stat: "2 min",
    title: "Time to first board",
    desc: "Sign up, create a workspace, and start organizing work in under two minutes.",
  },
];

const CHECKLIST = [
  "Unlimited tasks on every plan",
  "Kanban and Scrum in one tool",
  "Recurring tasks and automations",
  "Role-based access control",
  "Export and API access",
  "99.9% uptime guarantee",
];

export function BenefitsSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div className="lp-reveal">
            <span className="lp-section-label">Why MiniTask</span>
            <h2 className="lp-heading mt-4">
              Built for teams that{" "}
              <span className="gradient-text">move fast</span>
            </h2>
            <p className="lp-body-lg mt-3 max-w-lg">
              Stop juggling spreadsheets and scattered tools. One workspace for every project, sprint, and deliverable.
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
