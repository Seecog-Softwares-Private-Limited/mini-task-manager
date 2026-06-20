"use client";

import { useEffect, useRef, useCallback } from "react";

/** Intersection Observer hook that adds `.revealed` class to elements with scroll-reveal classes */
export function useScrollReveal() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const targets = container.querySelectorAll(
      ".scroll-reveal, .scroll-reveal-scale, .scroll-reveal-left, .scroll-reveal-right, .reveal-list, .lp-reveal"
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  return containerRef;
}

/** Spotlight effect — follows cursor inside a container */
export function useSpotlight() {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--spotlight-x", `${x}%`);
    el.style.setProperty("--spotlight-y", `${y}%`);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("mousemove", handleMove);
    return () => el.removeEventListener("mousemove", handleMove);
  }, [handleMove]);

  return ref;
}

/** Animated counter hook */
export function useCounter(end: number, duration = 2000, startOnReveal = true) {
  const ref = useRef<HTMLSpanElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function animate() {
      if (animated.current) return;
      animated.current = true;
      const start = 0;
      const startTime = performance.now();

      function tick(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (end - start) * eased);
        if (el) el.textContent = current.toLocaleString();
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    if (!startOnReveal) {
      animate();
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate();
          obs.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, duration, startOnReveal]);

  return ref;
}

/** Scroll progress (0 → 1) */
export function useScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onScroll() {
      const el = ref.current;
      if (!el) return;
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? scrollTop / docHeight : 0;
      el.style.transform = `scaleX(${progress})`;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return ref;
}

/** Tilt card effect */
export function useTilt(intensity = 8) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function handleMove(e: MouseEvent) {
      const rect = el!.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el!.style.transform = `perspective(1000px) rotateX(${-y * intensity}deg) rotateY(${x * intensity}deg)`;
    }
    function handleLeave() {
      el!.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
    }

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, [intensity]);

  return ref;
}
