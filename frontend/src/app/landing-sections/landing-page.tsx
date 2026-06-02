"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import "../landing.css";
import { useScrollReveal, useSpotlight, useScrollProgress, useTilt } from "./hooks";


/* ═══════════════════════════════════════════════════════════════
   ICON COMPONENTS — hand-crafted SVGs for pixel-perfect icons
   ═══════════════════════════════════════════════════════════════ */
function IconKanban({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M9 3v18M15 3v18M3 9h6M3 15h6M9 12h6M15 9h6" />
    </svg>
  );
}
function IconAutomation({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconShield({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5.25-3.5 9.75-8 11-4.5-1.25-8-5.75-8-11V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function IconChart({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-8 4 4 5-9" />
    </svg>
  );
}
function IconTeam({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21 21v-1.5a3 3 0 00-2-2.83" />
    </svg>
  );
}
function IconIntegration({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="8" height="12" rx="2" />
      <rect x="14" y="6" width="8" height="12" rx="2" />
      <path d="M10 12h4" />
    </svg>
  );
}
function IconArrowRight({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
function IconCheck({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
function IconSparkle({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PARTICLES — Floating ambient particles
   ═══════════════════════════════════════════════════════════════ */
function Particles({ count = 30 }: { count?: number }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${2 + Math.random() * 4}px`,
      duration: `${6 + Math.random() * 12}s`,
      delay: `${Math.random() * 5}s`,
      px: `${(Math.random() - 0.5) * 40}px`,
      py: `${(Math.random() - 0.5) * 40}px`,
      px2: `${(Math.random() - 0.5) * 30}px`,
      py2: `${(Math.random() - 0.5) * 30}px`,
      px3: `${(Math.random() - 0.5) * 35}px`,
      py3: `${(Math.random() - 0.5) * 35}px`,
      color: ["text-indigo-400/40", "text-purple-400/30", "text-blue-400/30", "text-pink-400/20"][i % 4],
    }));
  }, [count]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className={`particle ${p.color}`}
          style={{
            left: p.left,
            top: p.top,
            "--size": p.size,
            "--duration": p.duration,
            "--delay": p.delay,
            "--px": p.px, "--py": p.py,
            "--px2": p.px2, "--py2": p.py2,
            "--px3": p.px3, "--py3": p.py3,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════════════════ */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "nav-glass shadow-lg shadow-black/[0.03]"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/25 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <span className="text-lg font-black text-white tracking-tight">M</span>
            <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Mini<span className="animated-gradient-text">Task</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {["Features", "Pricing"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="relative px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground group"
            >
              {item}
              <span className="absolute bottom-0 left-1/2 h-0.5 w-0 bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 group-hover:left-2 group-hover:w-[calc(100%-16px)]" />
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:text-primary"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="magnetic-btn relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:brightness-110 active:scale-[0.97]"
          >
            Start Free
            <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex flex-col gap-1.5 p-2"
          aria-label="Menu"
        >
          <span className={`h-0.5 w-6 bg-foreground rounded transition-all duration-300 ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`h-0.5 w-6 bg-foreground rounded transition-all duration-300 ${mobileOpen ? "opacity-0" : ""}`} />
          <span className={`h-0.5 w-6 bg-foreground rounded transition-all duration-300 ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-500 ${mobileOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="nav-glass border-t border-border/50 px-6 pb-6 pt-4 space-y-3">
          {["Features", "Pricing"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {item}
            </a>
          ))}
          <div className="flex gap-3 pt-3">
            <Link href="/login" className="flex-1 rounded-xl border border-border py-2.5 text-center text-sm font-semibold">Sign In</Link>
            <Link href="/signup" className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 py-2.5 text-center text-sm font-semibold text-white">Start Free</Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HERO SECTION
   ═══════════════════════════════════════════════════════════════ */
function HeroSection() {
  const tiltRef = useTilt(6);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-32">
      {/* Orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="orb orb-1" style={{ top: "-10%", left: "-5%" }} />
        <div className="orb orb-2" style={{ bottom: "-10%", right: "-5%" }} />
        <div className="orb orb-3" style={{ top: "30%", right: "15%" }} />
        <div className="orb orb-4" style={{ bottom: "20%", left: "20%" }} />
      </div>

      <Particles count={25} />

      <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
        {/* Floating badge */}
        <div className="float-badge mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-200/50 bg-white/60 px-5 py-2 text-sm backdrop-blur-xl dark:border-indigo-500/20 dark:bg-white/5 text-reveal stagger-1">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500">
            <IconSparkle className="h-3 w-3 text-white" />
          </div>
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">Now in early access</span>
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">BETA</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95]">
          <span className="text-reveal stagger-2 block">Ship faster.</span>
          <span className="text-reveal stagger-3 block mt-2">
            <span className="animated-gradient-text">Manage</span> smarter.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-reveal stagger-4 mx-auto mt-8 max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
          The project management platform that teams actually love. Kanban boards, sprints,
          automations, and real-time collaboration — all in one beautiful workspace.
        </p>

        {/* CTA Buttons */}
        <div className="text-reveal stagger-5 mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="magnetic-btn group relative inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-8 py-4 text-base font-bold text-white shadow-2xl shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:brightness-110 active:scale-[0.97]"
          >
            <span>Start Free — No Credit Card</span>
            <IconArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Hero visual — Dashboard mockup with tilt */}
        <div className="text-reveal stagger-7 mt-16 perspective-[2000px]">
          <div ref={tiltRef} className="tilt-card mx-auto max-w-5xl">
            <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/60 shadow-2xl shadow-black/10 backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/60">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-black/5 px-4 py-3 dark:border-white/5">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-400/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
                </div>
                <div className="ml-4 flex-1 rounded-lg bg-black/[0.04] px-4 py-1.5 text-xs text-muted-foreground dark:bg-white/[0.04]">
                  minitask.app/dashboard
                </div>
              </div>
              {/* Mock dashboard content */}
              <div className="p-6 sm:p-8">
                <div className="grid grid-cols-12 gap-4">
                  {/* Sidebar */}
                  <div className="col-span-3 hidden sm:block space-y-3">
                    <div className="h-8 w-full rounded-lg bg-gradient-to-r from-indigo-500/10 to-purple-500/10" />
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-6 rounded-md bg-black/[0.03] dark:bg-white/[0.04]" style={{ width: `${60 + Math.random() * 30}%` }} />
                    ))}
                  </div>
                  {/* Main */}
                  <div className="col-span-12 sm:col-span-9 space-y-4">
                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Active Tasks", val: "42", color: "from-indigo-500 to-blue-500" },
                        { label: "Completed", val: "128", color: "from-emerald-500 to-teal-500" },
                        { label: "Team Members", val: "12", color: "from-purple-500 to-pink-500" },
                      ].map((s, i) => (
                        <div key={i} className="rounded-xl border border-black/5 bg-white/80 p-3 dark:border-white/5 dark:bg-white/[0.03]">
                          <div className={`mb-1 text-xs font-medium text-muted-foreground`}>{s.label}</div>
                          <div className={`text-2xl font-black bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.val}</div>
                        </div>
                      ))}
                    </div>
                    {/* Kanban columns */}
                    <div className="grid grid-cols-3 gap-3">
                      {["To Do", "In Progress", "Done"].map((col, ci) => (
                        <div key={ci} className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                            <div className={`h-2 w-2 rounded-full ${["bg-slate-400", "bg-amber-400", "bg-emerald-400"][ci]}`} />
                            {col}
                          </div>
                          {[...Array(2 + ci)].map((_, i) => (
                            <div key={i} className="rounded-lg border border-black/5 bg-white/90 p-2.5 shadow-sm dark:border-white/5 dark:bg-white/[0.04]">
                              <div className="h-2.5 rounded bg-black/[0.06] dark:bg-white/[0.08]" style={{ width: `${50 + Math.random() * 40}%` }} />
                              <div className="mt-2 h-2 rounded bg-black/[0.04] dark:bg-white/[0.05]" style={{ width: `${30 + Math.random() * 30}%` }} />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {/* Gradient overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white/90 via-white/50 to-transparent dark:from-gray-900/90 dark:via-gray-900/50" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FEATURES — Bento Grid
   ═══════════════════════════════════════════════════════════════ */
const features = [
  {
    icon: IconKanban,
    title: "Kanban & Scrum Boards",
    desc: "Drag-and-drop task boards with customizable columns, WIP limits, and swimlanes. Switch between Kanban and Scrum with one click.",
    gradient: "from-blue-500 to-indigo-600",
    span: "md:col-span-2",
  },
  {
    icon: IconAutomation,
    title: "Smart Automations",
    desc: "Create powerful automation rules. When a task moves to Done, auto-notify stakeholders, update status, and log time.",
    gradient: "from-purple-500 to-pink-600",
    span: "md:col-span-1",
  },
  {
    icon: IconTeam,
    title: "Real-Time Collaboration",
    desc: "See your team working live. @mentions, comments, and activity feeds keep everyone aligned without endless meetings.",
    gradient: "from-emerald-500 to-teal-600",
    span: "md:col-span-1",
  },
  {
    icon: IconChart,
    title: "Advanced Analytics",
    desc: "Velocity charts, burndown graphs, cycle time tracking, and custom dashboards. Turn data into decisions with one-click insights.",
    gradient: "from-amber-500 to-orange-600",
    span: "md:col-span-2",
  },
  {
    icon: IconShield,
    title: "Enterprise Security",
    desc: "Role-based access control, API key management, audit logs, and organization-level security. Built with security best practices from day one.",
    gradient: "from-rose-500 to-red-600",
    span: "md:col-span-1",
  },
  {
    icon: IconIntegration,
    title: "Seamless Integrations",
    desc: "API-first architecture with full REST API and API key management. Build custom integrations and connect your existing tools programmatically.",
    gradient: "from-indigo-500 to-violet-600",
    span: "md:col-span-2",
  },
];

function FeaturesSection() {
  const spotlightRef = useSpotlight();

  return (
    <section id="features" className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 aurora-bg pointer-events-none" />
      <Particles count={15} />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="scroll-reveal text-center mb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/50 bg-indigo-50/50 px-4 py-1.5 text-xs font-semibold text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 mb-6">
            <IconSparkle className="h-3.5 w-3.5" />
            POWERFUL FEATURES
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight">
            Everything you need.
            <br />
            <span className="animated-gradient-text">Nothing you don&apos;t.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Purpose-built for modern teams. Every feature designed to reduce friction and multiply your team&apos;s output.
          </p>
        </div>

        {/* Bento Grid */}
        <div
          ref={spotlightRef}
          className="spotlight-container grid gap-5 md:grid-cols-3"
        >
          {features.map((f, i) => (
            <div
              key={i}
              className={`bento-card scroll-reveal relative overflow-hidden rounded-2xl border border-white/30 bg-white/50 p-8 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03] ${f.span}`}
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <div className={`feature-icon mb-5 inline-flex items-center justify-center rounded-2xl bg-gradient-to-br ${f.gradient} p-3.5 text-white shadow-lg`}>
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
              {/* Decorative corner gradient */}
              <div className={`absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-gradient-to-br ${f.gradient} opacity-[0.06] blur-2xl`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HOW IT WORKS — Horizontal Steps
   ═══════════════════════════════════════════════════════════════ */
function HowItWorks() {
  const steps = [
    { num: "01", title: "Sign Up in Seconds", desc: "Create your workspace with just an email. No credit card, no lengthy onboarding. You're in.", color: "from-blue-500 to-indigo-600" },
    { num: "02", title: "Organize Your Way", desc: "Set up projects with Kanban or Scrum boards. Customize workflows, statuses, and labels to match how your team works.", color: "from-purple-500 to-pink-600" },
    { num: "03", title: "Collaborate & Ship", desc: "Assign tasks, track sprints, automate workflows. Your team ships faster with real-time visibility into everything.", color: "from-emerald-500 to-teal-600" },
  ];

  return (
    <section className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 aurora-bg opacity-50 pointer-events-none" />
      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="scroll-reveal text-center mb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/50 bg-emerald-50/50 px-4 py-1.5 text-xs font-semibold text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 mb-6">
            3 SIMPLE STEPS
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight">
            Up and running <span className="animated-gradient-text">in minutes</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="scroll-reveal relative" style={{ transitionDelay: `${i * 0.15}s` }}>
              <div className="relative overflow-hidden rounded-2xl border border-white/30 bg-white/50 p-8 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03] h-full">
                <div className={`inline-flex items-center justify-center rounded-full bg-gradient-to-r ${step.color} h-12 w-12 text-lg font-black text-white shadow-lg mb-6`}>
                  {step.num}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-border to-transparent z-10" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PRICING
   ═══════════════════════════════════════════════════════════════ */
function PricingSection() {
  const [annual, setAnnual] = useState(false);

  const plans = [
    {
      name: "Free",
      slug: "free",
      desc: "For getting started with core task management",
      price: 0,
      priceAnnual: 0,
      gradient: "from-slate-500 to-slate-700",
      border: "border-slate-200 dark:border-slate-700",
      features: [
        "1 workspace",
        "5 members / workspace",
        "500 MB storage",
        "Kanban boards",
        "Basic reporting",
        "Community support",
      ],
      cta: "Get Started Free",
      popular: false,
    },
    {
      name: "Silver",
      slug: "silver",
      desc: "For teams that need more members and storage",
      price: 500,
      priceAnnual: 510, // placeholder (annual toggle is cosmetic on landing)
      gradient: "from-slate-300 via-slate-200 to-slate-300",
      border: "border-slate-300 dark:border-slate-600",
      features: [
        "1 workspace",
        "20 members / workspace",
        "2 GB storage",
        "Upgraded reporting",
        "Priority email support",
        "Faster collaboration",
      ],
      cta: "Upgrade to Silver",
      popular: true,
    },
    {
      name: "Gold",
      slug: "gold",
      desc: "For power users who need more workspaces",
      price: 1000,
      priceAnnual: 1020, // placeholder (annual toggle is cosmetic on landing)
      gradient: "from-amber-500 via-yellow-400 to-amber-300",
      border: "border-amber-300 dark:border-amber-600",
      features: [
        "10 workspaces",
        "Unlimited members / workspace",
        "4 GB storage",
        "Advanced analytics",
        "Gold support",
        "Priority upgrades",
      ],
      cta: "Upgrade to Gold",
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 aurora-bg opacity-40 pointer-events-none" />
      <Particles count={10} />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="scroll-reveal text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200/50 bg-purple-50/50 px-4 py-1.5 text-xs font-semibold text-purple-600 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400 mb-6">
            SIMPLE PRICING
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight">
            Start free. <span className="animated-gradient-text">Scale infinitely.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Transparent pricing that grows with your team. No hidden fees ever.
          </p>

          {/* Toggle */}
          <div className="mt-10 inline-flex items-center gap-4 rounded-full border border-border/60 bg-white/50 p-1.5 backdrop-blur-xl dark:bg-white/5">
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300 ${
                !annual ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300 ${
                annual ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <span className="ml-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                -15%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8 items-start">
          {plans.map((plan, i) => (
            <div
              key={plan.slug}
              className={`scroll-reveal pricing-card-glow relative rounded-2xl border-2 ${plan.border} bg-white/60 backdrop-blur-xl dark:bg-white/[0.03] overflow-hidden transition-all duration-500 hover:shadow-2xl ${
                plan.popular ? "md:scale-105 shadow-xl ring-2 ring-purple-500/20" : "shadow-lg"
              }`}
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              {/* Top gradient bar */}
              <div className={`h-1.5 bg-gradient-to-r ${plan.gradient}`} />

              {plan.popular && (
                <div className="absolute -top-0 right-6">
                  <div className="rounded-b-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-4 py-1.5 text-[10px] font-bold text-white shadow-lg">
                    MOST POPULAR
                  </div>
                </div>
              )}

              <div className="p-8">
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>

                <div className="mt-6 mb-8">
                  {plan.price === 0 ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black">₹0</span>
                      <span className="text-muted-foreground">/forever</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-black">₹{annual ? plan.priceAnnual : plan.price}</span>
                        <span className="text-muted-foreground">/user/mo</span>
                      </div>
                      {annual && (
                        <div className="mt-1 text-sm text-muted-foreground">
                          <span className="line-through">₹{plan.price}</span>
                          <span className="ml-2 text-emerald-600 font-semibold">Save 15%</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Link
                  href="/signup"
                  className={`magnetic-btn block w-full rounded-xl py-3.5 text-center text-sm font-bold transition-all duration-300 ${
                    plan.popular
                      ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl hover:brightness-110"
                      : "border-2 border-border/60 bg-white/50 text-foreground hover:border-indigo-300 hover:bg-indigo-50/50 dark:bg-white/5 dark:hover:bg-white/10"
                  }`}
                >
                  {plan.cta}
                </Link>

                <div className="mt-8 space-y-3">
                  {plan.features.map((f, fi) => (
                    <div key={fi} className="flex items-start gap-3 text-sm">
                      <IconCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FINAL CTA
   ═══════════════════════════════════════════════════════════════ */
function FinalCTA() {
  return (
    <section className="relative py-32 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="orb orb-1" style={{ top: "10%", left: "10%" }} />
        <div className="orb orb-2" style={{ bottom: "10%", right: "10%" }} />
      </div>
      <Particles count={20} />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <div className="scroll-reveal">
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.05]">
            Ready to ship
            <br />
            <span className="animated-gradient-text">faster?</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Built for startups and teams who move fast.
            Start free, no credit card required.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="magnetic-btn group relative inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-10 py-5 text-lg font-bold text-white shadow-2xl shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:brightness-110 active:scale-[0.97]"
            >
              <span>Get Started for Free</span>
              <IconArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            ✓ No credit card &nbsp; ✓ 14-day Pro trial &nbsp; ✓ Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="relative border-t border-border/40 bg-muted/20 pt-20 pb-10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 sm:grid-cols-2 items-center">
          <div>
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg">
                <span className="text-lg font-black text-white">M</span>
              </div>
              <span className="text-xl font-bold tracking-tight">
                Mini<span className="animated-gradient-text">Task</span>
              </span>
            </Link>
            <p className="mt-4 max-w-md text-sm text-muted-foreground leading-relaxed">
              Minimal footer showing what is implemented. Use the product and pricing pages to learn what's available, or sign in to access your workspace.
            </p>
          </div>

          <div className="flex gap-3 justify-start sm:justify-end">
            <Link href="/login" className="rounded-full px-4 py-2 text-sm font-semibold border border-border/60 bg-white/50 hover:bg-indigo-50/50">
              Sign In
            </Link>
            <Link href="/signup" className="rounded-full px-4 py-2 text-sm font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
              Get Started
            </Link>
          </div>
        </div>

        <div className="gradient-divider mt-16 mb-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} MiniTask. All rights reserved.</p>
          <p>Built and maintained by the MiniTask team.</p>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LANDING PAGE — Main composition
   ═══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const scrollRef = useScrollReveal();
  const progressRef = useScrollProgress();

  useEffect(() => {
    document.documentElement.classList.add("lp-active");
    return () => document.documentElement.classList.remove("lp-active");
  }, []);

  return (
    <div ref={scrollRef} className="grain-overlay relative min-h-screen overflow-x-hidden">
      {/* Scroll progress bar */}
      <div ref={progressRef} className="scroll-progress" />

      <Navbar />

      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorks />
        <PricingSection />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
