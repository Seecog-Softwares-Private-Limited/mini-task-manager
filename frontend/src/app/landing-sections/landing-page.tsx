"use client";

import { useEffect } from "react";
import "../landing.css";
import { useScrollReveal, useScrollProgress } from "./hooks";
import { Navbar } from "./sections/navbar";
import { HeroSection } from "./sections/hero";
import { FeaturesSection } from "./sections/features";
import { BenefitsSection } from "./sections/benefits";
import { HowItWorksSection } from "./sections/how-it-works";
import { TestimonialsSection } from "./sections/testimonials";
import { PricingSection } from "./sections/pricing";
import { FaqSection } from "./sections/faq";
import { FinalCtaSection } from "./sections/final-cta";
import { Footer } from "./sections/footer";

export default function LandingPage() {
  const scrollRef = useScrollReveal();
  const progressRef = useScrollProgress();

  useEffect(() => {
    document.documentElement.classList.add("lp-active");
    return () => document.documentElement.classList.remove("lp-active");
  }, []);

  return (
    <div ref={scrollRef} className="lp-root relative min-h-screen overflow-x-hidden">
      <div ref={progressRef} className="lp-scroll-progress" aria-hidden />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
      >
        Skip to content
      </a>

      <Navbar />

      <main id="main-content">
        <HeroSection />
        <FeaturesSection />
        <BenefitsSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <PricingSection />
        <FaqSection />
        <FinalCtaSection />
      </main>

      <Footer />
    </div>
  );
}
