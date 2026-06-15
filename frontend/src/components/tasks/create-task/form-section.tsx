"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function CreateTaskFormSection({
  title,
  children,
  className,
  hideTitle,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  hideTitle?: boolean;
}) {
  return (
    <section
      className={cn(
        "border-t border-border/35 pt-5 first:border-t-0 first:pt-0",
        className
      )}
    >
      {!hideTitle ? (
        <h3 className="mb-3 text-[11px] font-medium text-muted-foreground">{title}</h3>
      ) : null}
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

export const CREATE_FIELD_LABEL = cn(
  "text-[11px] font-medium leading-none text-muted-foreground"
);
