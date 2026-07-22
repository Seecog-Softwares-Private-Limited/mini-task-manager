"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { IconArrowRight, IconLogo } from "../icons";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "lp-nav-glass" : "bg-transparent"}`}>
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 lg:px-8" aria-label="Main navigation">
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="OpsPick home">
          <IconLogo className="h-9 w-9 transition-transform duration-200 group-hover:scale-105" />
          <span className="text-[1.0625rem] font-semibold tracking-tight text-foreground">OpsPick</span>
        </Link>

        <div className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map((item) => (
            <a key={item.href} href={item.href} className="lp-btn-ghost">{item.label}</a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Link href="/login" className="lp-btn-ghost">Sign in</Link>
          <Link href="/signup" className="lp-btn-primary">
            Start free
            <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex flex-col justify-center gap-1.5 p-2 -mr-2 rounded-lg hover:bg-muted/50 transition-colors"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          <span className={`block h-0.5 w-5 bg-foreground rounded transition-all duration-300 origin-center ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block h-0.5 w-5 bg-foreground rounded transition-all duration-300 ${mobileOpen ? "opacity-0 scale-x-0" : ""}`} />
          <span className={`block h-0.5 w-5 bg-foreground rounded transition-all duration-300 origin-center ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </nav>

      {mobileOpen && (
        <div className="md:hidden lp-nav-glass">
          <div className="px-6 pb-6 pt-2 space-y-1">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block py-3 text-[0.9375rem] font-medium text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
            <div className="pt-4 flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileOpen(false)} className="lp-btn-secondary w-full">Sign in</Link>
              <Link href="/signup" onClick={() => setMobileOpen(false)} className="lp-btn-primary w-full">
                Start free
                <IconArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
