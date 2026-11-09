import { SpotlightCard } from "./spotlight-card";

const TESTIMONIALS = [
  {
    quote: "OpsPick replaced our WhatsApp groups and paper checklists across 9 outlets. Our FSSAI audits used to take a day to prep — now it's one export.",
    name: "Priya Nair",
    role: "Operations Head",
    company: "Spice Route Kitchens",
    initials: "PN",
  },
  {
    quote: "Every site supervisor logs snags the same way now. RERA evidence that used to take our PMO a week to compile is ready in minutes.",
    name: "Arjun Mehta",
    role: "Project Director",
    company: "Horizon Builders",
    initials: "AM",
  },
  {
    quote: "We run housekeeping and security across 22 client sites. OpsPick's SLA reports are the first thing we show clients every month.",
    name: "Sana Qureshi",
    role: "FM Operations Manager",
    company: "Clearview Facilities",
    initials: "SQ",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-20 sm:py-28" aria-label="Customer testimonials">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="lp-reveal mx-auto max-w-2xl text-center mb-14">
          <span className="lp-section-label">Testimonials</span>
          <h2 className="lp-heading mt-4">Loved by operations teams everywhere</h2>
          <p className="lp-body-lg mt-3">See why teams across industries run their day-to-day on OpsPick.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <SpotlightCard
              key={t.name}
              className="lp-card lp-reveal p-6 flex flex-col"
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <figure className="flex flex-1 flex-col">
                <span className="lp-quote-mark" aria-hidden>&ldquo;</span>
                <blockquote className="flex-1 -mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 pt-4 border-t border-border/60">
                  <div className="lp-avatar" aria-hidden>{t.initials}</div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}, {t.company}</div>
                  </div>
                </figcaption>
              </figure>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
}
