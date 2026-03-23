"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const authInputClass = cn(
  "h-12 rounded-xl border border-slate-200/90 bg-white/80 text-[15px] text-slate-900 placeholder:text-slate-400",
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-sm",
  "transition-[border-color,box-shadow,background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
  "hover:bg-white/95 hover:border-slate-300/95",
  "focus-visible:border-violet-400/80 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-violet-500/15 focus-visible:shadow-[0_0_0_1px_rgba(139,92,246,0.22),0_8px_20px_-12px_rgba(109,40,217,0.35)]"
);

export const authPrimaryButtonClass = cn(
  "h-12 w-full rounded-xl text-[15px] font-semibold tracking-[0.01em] text-white",
  "bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500",
  "shadow-[0_10px_24px_-10px_rgba(16,185,129,0.6),inset_0_1px_0_rgba(255,255,255,0.35)]",
  "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
  "hover:-translate-y-0.5 hover:brightness-[1.04] hover:shadow-[0_18px_30px_-12px_rgba(16,185,129,0.7)]",
  "active:translate-y-0 active:scale-[0.995] active:brightness-95",
  "disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
);

export const authSecondaryButtonClass = cn(
  "h-11 w-full rounded-xl border border-slate-200/80 bg-white/55 text-[14px] font-medium text-slate-600",
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-sm",
  "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
  "hover:-translate-y-0.5 hover:border-slate-300/80 hover:bg-white/78 hover:text-slate-900 hover:shadow-[0_10px_20px_-14px_rgba(15,23,42,0.28)]",
  "focus-visible:ring-4 focus-visible:ring-violet-500/12"
);

export const authGoogleButtonClass = cn(
  "h-12 w-full rounded-xl border border-slate-200/85 bg-white/72 text-[14px] font-medium text-slate-700",
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_2px_6px_-4px_rgba(15,23,42,0.12)] backdrop-blur-sm",
  "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
  "hover:-translate-y-0.5 hover:border-slate-300/90 hover:bg-white hover:shadow-[0_14px_26px_-16px_rgba(15,23,42,0.32)]",
  "focus-visible:ring-4 focus-visible:ring-violet-500/12"
);

export function AuthDivider({ label = "Or continue with" }: { label?: string }) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent h-px" />
      </div>
      <div className="relative flex justify-center">
        <span className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-sm">
          {label}
        </span>
      </div>
    </div>
  );
}

export function PremiumAuthShell({
  children,
  dataCy,
}: {
  children: ReactNode;
  dataCy: string;
}) {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10"
      data-cy={dataCy}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[#F6F8FC]" />
      {/* Slow-moving light-blue wash — animates via CSS in globals */}
      <div className="auth-sky-wash pointer-events-none absolute inset-0 -z-10" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_18%,rgba(167,139,250,0.2),transparent_42%),radial-gradient(circle_at_88%_14%,rgba(125,211,252,0.2),transparent_40%),radial-gradient(circle_at_52%_86%,rgba(147,197,253,0.16),transparent_44%),radial-gradient(circle_at_72%_44%,rgba(196,181,253,0.12),transparent_52%)]" />
      <div className="auth-task-pattern pointer-events-none absolute inset-0 -z-10" />
      <div className="auth-ambient-blob pointer-events-none absolute -left-32 top-12 -z-10 h-[24rem] w-[24rem] rounded-full bg-violet-300/32 blur-3xl" />
      <div className="auth-ambient-blob auth-ambient-blob--alt pointer-events-none absolute -right-28 bottom-8 -z-10 h-[20rem] w-[20rem] rounded-full bg-sky-300/30 blur-3xl [animation-delay:-5s]" />
      <div className="auth-ambient-blob pointer-events-none absolute left-1/2 top-[58%] -z-10 h-[18rem] w-[18rem] -translate-x-1/2 rounded-full bg-indigo-200/28 blur-3xl [animation-delay:-9s]" />
      <div className="auth-ambient-blob auth-ambient-blob--slow pointer-events-none absolute right-[8%] top-[30%] -z-10 h-[14rem] w-[14rem] rounded-full bg-cyan-200/24 blur-3xl [animation-delay:-2s]" />
      <div className="auth-grid pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:42px_42px] [mask-image:radial-gradient(ellipse_at_center,black_58%,transparent_100%)]" />
      <div className="auth-vignette pointer-events-none absolute inset-0 -z-10" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-44 bg-gradient-to-b from-white/55 to-transparent" />
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
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="auth-card-enter relative w-full max-w-md">
      <div className="absolute -inset-px rounded-[1.8rem] bg-gradient-to-br from-white/75 via-sky-100/35 to-violet-100/20 opacity-90 blur-[1px]" />
      <div className="auth-glass-panel relative rounded-[1.75rem] border border-white/70 p-7 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_28px_68px_-24px_rgba(15,23,42,0.28),inset_0_1px_0_rgba(255,255,255,0.92)] sm:p-9">
        <div className="mb-7 text-center sm:mb-8">
          {/* Pop (once) on wrapper; float (loop) on inner — two animations must not share one element */}
          <div className="auth-icon-pop mx-auto mb-4 flex justify-center">
            <div className="auth-icon-float inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/60 bg-gradient-to-br from-violet-500 via-indigo-500 to-fuchsia-500 text-white shadow-[0_14px_26px_-12px_rgba(109,40,217,0.62)]">
              {icon}
            </div>
          </div>
          <h1 className="text-[1.7rem] font-semibold tracking-[-0.02em] text-slate-900 sm:text-[1.85rem]">
            {title}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
            {subtitle}
          </p>
        </div>

        {children}

        {footer ? <div className="mt-6 text-center">{footer}</div> : null}
      </div>
    </div>
  );
}
