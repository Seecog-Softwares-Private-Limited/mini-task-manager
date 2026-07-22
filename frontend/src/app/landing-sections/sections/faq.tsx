"use client";

import { useState } from "react";
import { IconChevronDown } from "../icons";

const FAQ_ITEMS = [
  {
    q: "Is there a free plan?",
    a: "Yes. The Free plan includes one workspace, up to 5 members, and 500 MB of storage — forever. No credit card required.",
  },
  {
    q: "Can I switch between Kanban and Scrum?",
    a: "Every project supports both Kanban and Scrum views. Switch between them with one click without losing any data.",
  },
  {
    q: "How does billing work?",
    a: "Paid plans are billed per user per month. Choose monthly or annual billing — annual saves 15%. Upgrade, downgrade, or cancel anytime.",
  },
  {
    q: "Is my data secure?",
    a: "OpsPick includes role-based access control, API key management, audit logs, and organization-level security. Data is encrypted in transit and at rest.",
  },
  {
    q: "Can I import data from other tools?",
    a: "Use our REST API to programmatically import tasks and projects. CSV export is available on all plans.",
  },
  {
    q: "What happens when my trial ends?",
    a: "You'll be moved to the Free plan automatically — no charges unless you choose to upgrade. All your data stays intact.",
  },
];

function FaqItem({ q, a, isOpen, onToggle }: { q: string; a: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="lp-faq-item" data-open={isOpen}>
      <button type="button" className="lp-faq-trigger" onClick={onToggle} aria-expanded={isOpen}>
        {q}
        <IconChevronDown className="lp-faq-icon" />
      </button>
      <div className="lp-faq-content">
        <div className="lp-faq-content-inner">
          <p className="lp-faq-answer">{a}</p>
        </div>
      </div>
    </div>
  );
}

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <div className="lp-reveal text-center mb-10">
          <span className="lp-section-label">FAQ</span>
          <h2 className="lp-heading mt-4">Frequently asked questions</h2>
          <p className="lp-body-lg mt-3">Everything you need to know before getting started.</p>
        </div>

        <div className="lp-reveal lp-card px-5 sm:px-7">
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem
              key={item.q}
              q={item.q}
              a={item.a}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
