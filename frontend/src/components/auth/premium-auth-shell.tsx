"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { OpsPickWordmark } from "@/components/brand/opspick-logo";

export const authInputClass = cn(
  "h-11 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground",
  "shadow-sm transition-[border-color,box-shadow] duration-200",
  "hover:border-border/80",
  "focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:ring-offset-0"
);

export const authPrimaryButtonClass = cn(
  "h-11 w-full rounded-lg text-sm font-semibold text-primary-foreground",
  "bg-primary shadow-sm shadow-primary/25",
  "transition-all duration-200",
  "hover:bg-primary/90 hover:shadow-md hover:shadow-primary/30",
  "active:scale-[0.99]",
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
);

export const authSecondaryButtonClass = cn(
  "h-10 w-full rounded-lg border border-input bg-background text-sm font-medium text-foreground",
  "shadow-sm transition-all duration-200",
  "hover:bg-muted/50",
  "focus-visible:ring-2 focus-visible:ring-primary/15"
);

export const authGoogleButtonClass = cn(
  "h-11 w-full rounded-lg border border-input bg-background text-sm font-medium text-foreground",
  "shadow-sm transition-all duration-200",
  "hover:bg-muted/50",
  "focus-visible:ring-2 focus-visible:ring-primary/15"
);

export const authLabelClass = cn(
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
);

export function AuthDivider({ label = "Or continue with" }: { label?: string }) {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border/60" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-background px-3 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}

export function AuthMethodTabs({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div
      className="mb-6 flex rounded-lg border border-input bg-muted/50 p-1"
      role="tablist"
      aria-label="Sign-in method"
    >
      {options.map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
              selected
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function AuthBrandPanel() {
  return (
    <div className="auth-brand-enter w-full">
      <OpsPickWordmark className="mb-5" logoClassName="h-11 w-11" priority />
      <p className="max-w-[16rem] text-sm leading-relaxed text-muted-foreground">
        Organize work. Ship faster.
      </p>
    </div>
  );
}

export function PremiumAuthShell({
  children,
  dataCy,
  brandPanel,
  reverseSplit = false,
}: {
  children: ReactNode;
  dataCy: string;
  brandPanel?: ReactNode;
  reverseSplit?: boolean;
}) {
  if (brandPanel) {
    return (
      <div
        className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-2"
        data-cy={dataCy}
      >
        <aside
          className={cn(
            "auth-split-brand relative hidden min-h-screen items-center justify-center border-border/60 px-10 py-12 lg:flex lg:px-14 xl:px-20",
            reverseSplit ? "border-l lg:order-2" : "border-r lg:order-1"
          )}
        >
          <div className="w-full max-w-[320px]">{brandPanel}</div>
        </aside>

        <main
          className={cn(
            "flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-14 xl:px-20",
            reverseSplit ? "lg:order-1" : "lg:order-2"
          )}
        >
          <div className="w-full max-w-[400px]">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10"
      data-cy={dataCy}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-background" />
      <div className="auth-sky-wash pointer-events-none absolute inset-0 -z-10" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_18%,hsl(var(--primary)/0.12),transparent_42%),radial-gradient(circle_at_88%_14%,rgba(125,211,252,0.15),transparent_40%)]" />
      <div className="auth-task-pattern pointer-events-none absolute inset-0 -z-10" />
      <div className="auth-ambient-blob pointer-events-none absolute -left-32 top-12 -z-10 h-[24rem] w-[24rem] rounded-full bg-primary/15 blur-3xl" />
      <div className="auth-ambient-blob auth-ambient-blob--alt pointer-events-none absolute -right-28 bottom-8 -z-10 h-[20rem] w-[20rem] rounded-full bg-sky-300/25 blur-3xl [animation-delay:-5s]" />
      <div className="auth-grid pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:42px_42px] [mask-image:radial-gradient(ellipse_at_center,black_58%,transparent_100%)]" />
      <div className="auth-vignette pointer-events-none absolute inset-0 -z-10" />
      {children}
    </div>
  );
}

export function PremiumAuthCard({
  title,
  subtitle,
  icon,
  children,
  footer,
  variant = "default",
}: {
  title: string;
  subtitle: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "default" | "compact";
}) {
  const isCompact = variant === "compact";

  return (
    <div className={cn("auth-card-enter w-full", isCompact ? "" : "max-w-md")}>
      <div
        className={cn(
          "relative rounded-xl border border-border/80 bg-card p-7 sm:p-8",
          !isCompact && "sm:p-9"
        )}
      >
        <div className={cn("mb-6", isCompact ? "text-left" : "mb-7 text-center sm:mb-8")}>
          {!isCompact && icon ? (
            <div className="auth-icon-pop mx-auto mb-4 flex justify-center">
              <div className="auth-icon-float inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/30">
                {icon}
              </div>
            </div>
          ) : null}
          {isCompact ? (
            <div className="mb-5 lg:hidden">
              <OpsPickWordmark logoClassName="h-9 w-9" priority />
            </div>
          ) : null}
          <h1
            className={cn(
              "font-semibold tracking-tight text-foreground",
              isCompact ? "text-[1.65rem]" : "text-[1.7rem] sm:text-[1.85rem]"
            )}
          >
            {title}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        </div>

        {children}

        {footer ? (
          <div className={cn("text-center", isCompact ? "mt-5" : "mt-6")}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AuthAlert({
  variant,
  children,
}: {
  variant: "error" | "success";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3.5 py-3 text-sm",
        variant === "error"
          ? "border-destructive/20 bg-destructive/8 text-destructive"
          : "border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400"
      )}
      role="alert"
    >
      {children}
    </div>
  );
}
