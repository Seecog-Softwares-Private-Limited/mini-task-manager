"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AuthBrandPanel } from "@/components/auth/premium-auth-shell";
import { AuthExchangeContext } from "@/components/auth/auth-exchange-context";

const EXCHANGE_MS = 520;
const CONTENT_FADE_MS = 120;
const EXCHANGE_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isSplitLayout() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

function measureColumnCenter(el: HTMLElement | null) {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

export function AuthSplitLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isSignup = pathname.startsWith("/signup");

  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const animatingRef = useRef(false);

  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [slideActive, setSlideActive] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);

  const syncAnchor = useCallback(
    (side: "left" | "right") => {
      const col = side === "left" ? leftColRef.current : rightColRef.current;
      const pos = measureColumnCenter(col);
      if (!pos) return;
      setAnchor(pos);
      setOffset({ x: 0, y: 0 });
    },
    []
  );

  useEffect(() => {
    if (animatingRef.current) return;

    function sync() {
      if (!isSplitLayout()) {
        setAnchor(null);
        setSlideActive(false);
        return;
      }
      syncAnchor(isSignup ? "left" : "right");
    }

    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [isSignup, syncAnchor]);

  const navigateWithExchange = useCallback(
    (href: string) => {
      if (!isSplitLayout() || prefersReducedMotion()) {
        router.push(href);
        return;
      }

      const goingSignup = href.startsWith("/signup");
      const fromSide: "left" | "right" = isSignup ? "left" : "right";
      const toSide: "left" | "right" = goingSignup ? "left" : "right";

      const fromCol = fromSide === "left" ? leftColRef.current : rightColRef.current;
      const toCol = toSide === "left" ? leftColRef.current : rightColRef.current;
      const fromPos = measureColumnCenter(fromCol);
      const toPos = measureColumnCenter(toCol);

      if (!fromPos || !toPos) {
        router.push(href);
        return;
      }

      animatingRef.current = true;
      setAnchor(fromPos);
      setOffset({ x: 0, y: 0 });
      setSlideActive(true);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setOffset({
            x: toPos.x - fromPos.x,
            y: toPos.y - fromPos.y,
          });
        });
      });

      const swapAt = EXCHANGE_MS * 0.48;

      window.setTimeout(() => {
        setContentVisible(false);
      }, swapAt - CONTENT_FADE_MS);

      window.setTimeout(() => {
        router.push(href);
        requestAnimationFrame(() => {
          setContentVisible(true);
        });
      }, swapAt);

      window.setTimeout(() => {
        animatingRef.current = false;
        setSlideActive(false);
        setAnchor(toPos);
        setOffset({ x: 0, y: 0 });
      }, EXCHANGE_MS + 50);
    },
    [router, isSignup]
  );

  const dataCy = isSignup ? "signup-page" : "login-page";

  return (
    <AuthExchangeContext.Provider value={{ navigateWithExchange }}>
      <div
        className="relative min-h-screen bg-background"
        data-cy={dataCy}
        data-auth-shell
        data-auth-sliding={slideActive ? "true" : undefined}
      >
        <div className="hidden min-h-screen lg:grid lg:grid-cols-2">
          <div
            ref={leftColRef}
            className={cn(
              "relative flex min-h-screen items-center justify-center px-10 py-12 transition-[background-color] duration-300 xl:px-20",
              !isSignup ? "auth-split-brand border-r border-border/60" : "bg-background"
            )}
          >
            <div
              className={cn(
                "w-full max-w-[320px] transition-opacity duration-250",
                isSignup ? "pointer-events-none opacity-0" : "opacity-100"
              )}
            >
              <AuthBrandPanel />
            </div>
          </div>

          <div
            ref={rightColRef}
            className={cn(
              "relative flex min-h-screen items-center justify-center px-10 py-12 transition-[background-color] duration-300 xl:px-20",
              isSignup ? "auth-split-brand border-l border-border/60" : "bg-background"
            )}
          >
            <div
              className={cn(
                "w-full max-w-[320px] transition-opacity duration-250",
                isSignup ? "opacity-100" : "pointer-events-none opacity-0"
              )}
            >
              <AuthBrandPanel />
            </div>
          </div>
        </div>

        <div className="flex min-h-screen items-center justify-center px-6 py-10 lg:hidden">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>

        {anchor ? (
          <div
            className="pointer-events-none hidden lg:block"
            style={{
              position: "fixed",
              left: anchor.x,
              top: anchor.y,
              width: "min(400px, calc(50vw - 3rem))",
              transform: `translate(-50%, -50%) translate3d(${offset.x}px, ${offset.y}px, 0)`,
              zIndex: 30,
              transition: slideActive
                ? `transform ${EXCHANGE_MS}ms ${EXCHANGE_EASING}`
                : "none",
              willChange: slideActive ? "transform" : "auto",
            }}
          >
            <div
              className={cn(
                "pointer-events-auto transition-opacity ease-out",
                contentVisible ? "opacity-100" : "opacity-0"
              )}
              style={{ transitionDuration: `${CONTENT_FADE_MS}ms` }}
            >
              {children}
            </div>
          </div>
        ) : null}
      </div>
    </AuthExchangeContext.Provider>
  );
}
