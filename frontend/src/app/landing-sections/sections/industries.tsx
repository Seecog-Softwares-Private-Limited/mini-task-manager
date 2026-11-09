import { IconCheck } from "../icons";
import { SpotlightCard } from "./spotlight-card";

const INDUSTRIES = [
  { code: "RST", label: "Restaurant", desc: "Outlets, kitchens, cloud kitchens", report: "FSSAI hygiene log" },
  { code: "CON", label: "Construction", desc: "Builders, real estate, contractors", report: "RERA progress evidence" },
  { code: "HOS", label: "Hospital", desc: "Hospitals, nursing homes, clinics", report: "NABH evidence pack" },
  { code: "SCH", label: "School", desc: "Schools, colleges, hostels", report: "Inspection evidence" },
  { code: "FM", label: "Facility management", desc: "Housekeeping, security, technical", report: "Client SLA report" },
  { code: "HTL", label: "Hotel", desc: "Hotels, resorts, service apartments", report: "Brand standards audit" },
  { code: "GEN", label: "General team / IT", desc: "IT teams, agencies, any office team", report: "Delivery report" },
];

export function IndustriesSection() {
  return (
    <section id="industries" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="lp-reveal mx-auto max-w-2xl text-center mb-14">
          <span className="lp-section-label">Industries</span>
          <h2 className="lp-heading mt-4">
            One engine. <span className="gradient-text">Seven industries.</span>
          </h2>
          <p className="lp-body-lg mt-3">
            Pick your industry edition at signup — OpsPick relabels sites, issues, and compliance reports to match how your team already talks.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {INDUSTRIES.map((ind, i) => (
            <SpotlightCard
              key={ind.code}
              className="lp-card lp-card-interactive lp-reveal p-5"
              style={{ transitionDelay: `${i * 0.05}s` }}
            >
              <div className="lp-industry-badge mb-4">{ind.code}</div>
              <h3 className="text-[0.9375rem] font-semibold text-foreground mb-1">{ind.label}</h3>
              <p className="text-[0.8125rem] text-muted-foreground leading-relaxed">{ind.desc}</p>
              <div className="lp-industry-report">
                <IconCheck className="h-3 w-3 text-success shrink-0" />
                {ind.report}
              </div>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
}
