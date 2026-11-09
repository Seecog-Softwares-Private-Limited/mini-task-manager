import { SpotlightCard } from "./spotlight-card";

const STEPS = [
  {
    num: "01",
    title: "Pick your industry",
    desc: "Choose from 7 industry editions — Restaurant, Construction, Hospital, Hotel, School, Facility Management, or General. OpsPick relabels itself to match your team's language instantly.",
  },
  {
    num: "02",
    title: "Add your sites & team",
    desc: "Set up outlets, sites, wards, or client locations. Invite your team and assign roles in minutes.",
  },
  {
    num: "03",
    title: "Track, resolve, and prove it",
    desc: "Log issues, run recurring checklists, and export audit-ready compliance evidence whenever you need it.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 lp-section-alt">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="lp-reveal mx-auto max-w-2xl text-center mb-14">
          <span className="lp-section-label">How it works</span>
          <h2 className="lp-heading mt-4">Up and running in minutes</h2>
          <p className="lp-body-lg mt-3">Three simple steps from signup to your first audit-ready export.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {STEPS.map((step, i) => (
            <SpotlightCard key={step.num} className="lp-reveal lp-card p-6" style={{ transitionDelay: `${i * 0.1}s` }}>
              <div className="lp-step-num mb-4">{step.num}</div>
              <h3 className="text-[1rem] font-semibold text-foreground mb-1.5">{step.title}</h3>
              <p className="text-[0.9375rem] text-muted-foreground leading-relaxed">{step.desc}</p>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
}
