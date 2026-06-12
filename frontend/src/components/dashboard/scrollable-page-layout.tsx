import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface ScrollablePageLayoutProps extends ComponentProps<"div"> {
  header: React.ReactNode;
  headerClassName?: string;
  bodyClassName?: string;
}

export function ScrollablePageLayout({
  header,
  children,
  className,
  headerClassName,
  bodyClassName,
  ...props
}: ScrollablePageLayoutProps) {
  return (
    <div
      className={cn(
        "flex h-0 min-h-0 flex-1 flex-col overflow-hidden animate-slide-up",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "shrink-0 border-b border-border bg-background pb-4 md:pb-6",
          headerClassName
        )}
      >
        {header}
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-y-contain pt-6",
          bodyClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
