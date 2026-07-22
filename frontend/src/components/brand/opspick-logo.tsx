"use client";

import { cn } from "@/lib/utils";

/** OpsPick brand mark — used on auth, landing, and shell chrome. */
export function OpsPickLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- public brand asset; avoid /_next/image auth/middleware edge cases
    <img
      src="/branding/opspick-logo.png"
      alt="OpsPick"
      width={44}
      height={44}
      decoding="async"
      {...(priority ? { fetchPriority: "high" as const } : {})}
      className={cn(
        "h-11 w-11 shrink-0 rounded-[10px] bg-white object-contain p-[3px] ring-1 ring-black/5 shadow-sm",
        className
      )}
    />
  );
}

/** Icon + wordmark lockup matching marketing brand. */
export function OpsPickWordmark({
  className,
  logoClassName,
  priority = false,
}: {
  className?: string;
  logoClassName?: string;
  priority?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <OpsPickLogo className={cn("h-9 w-9", logoClassName)} priority={priority} />
      <span className="text-[1.05rem] font-semibold tracking-tight text-foreground">
        OpsPick
      </span>
    </span>
  );
}
