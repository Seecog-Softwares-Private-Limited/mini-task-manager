const TESTIMONIALS = [
  {
    quote: "MiniTask replaced three tools for us. Our sprint velocity improved 40% in the first month, and the team actually enjoys using it.",
    name: "Sarah Chen",
    role: "Engineering Lead",
    company: "Northwind Labs",
    initials: "SC",
  },
  {
    quote: "The automations alone save us hours every week. Moving a task to Done triggers notifications, updates, and time logging automatically.",
    name: "Marcus Rivera",
    role: "Product Manager",
    company: "Globex Digital",
    initials: "MR",
  },
  {
    quote: "Clean, fast, and no bloat. We evaluated Linear, Jira, and Asana — MiniTask hit the sweet spot for our startup's pace and budget.",
    name: "Emily Watson",
    role: "CEO",
    company: "Acme Startup",
    initials: "EW",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-20 sm:py-28" aria-label="Customer testimonials">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="lp-reveal mx-auto max-w-2xl text-center mb-14">
          <span className="lp-section-label">Testimonials</span>
          <h2 className="lp-heading mt-4">Loved by teams everywhere</h2>
          <p className="lp-body-lg mt-3">See why fast-moving teams choose MiniTask.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <figure key={t.name} className="lp-card lp-reveal p-6 flex flex-col" style={{ transitionDelay: `${i * 0.08}s` }}>
              <blockquote className="flex-1 text-[0.9375rem] leading-relaxed text-muted-foreground">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3 pt-4 border-t border-border/60">
                <div className="lp-avatar" aria-hidden>{t.initials}</div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}, {t.company}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
