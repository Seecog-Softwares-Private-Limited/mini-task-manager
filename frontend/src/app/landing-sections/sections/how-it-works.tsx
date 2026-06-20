const STEPS = [
  {
    num: "01",
    title: "Create your workspace",
    desc: "Sign up with your email in seconds. No credit card, no sales call. Your workspace is ready immediately.",
  },
  {
    num: "02",
    title: "Organize your projects",
    desc: "Set up Kanban or Scrum boards, customize workflows, statuses, and labels to match how your team works.",
  },
  {
    num: "03",
    title: "Collaborate and ship",
    desc: "Assign tasks, track sprints, automate workflows. Real-time visibility keeps everyone aligned.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 lp-section-alt">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="lp-reveal mx-auto max-w-2xl text-center mb-14">
          <span className="lp-section-label">How it works</span>
          <h2 className="lp-heading mt-4">Up and running in minutes</h2>
          <p className="lp-body-lg mt-3">Three simple steps from signup to shipping.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {STEPS.map((step, i) => (
            <div key={step.num} className="lp-reveal lp-card p-6" style={{ transitionDelay: `${i * 0.1}s` }}>
              <div className="lp-step-num mb-4">{step.num}</div>
              <h3 className="text-[1rem] font-semibold text-foreground mb-1.5">{step.title}</h3>
              <p className="text-[0.9375rem] text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
