"use client";

import Link from "next/link";
import { ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_COMPANY_NAME } from "@/lib/app-brand";

export function DashboardCompanyBrand({
  collapsed,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        "group flex items-center gap-2.5 rounded-xl border border-[#E7EAF0] bg-[#FCFCFD] p-2 shadow-sm transition-colors hover:bg-white dark:border-border dark:bg-muted/25",
        collapsed && "justify-center px-1",
        className
      )}
      title={collapsed ? APP_COMPANY_NAME : undefined}
      aria-label={`${APP_COMPANY_NAME} home`}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg gradient-bg text-white shadow-md shadow-primary/20 transition-transform duration-200 group-hover:scale-[1.02]",
          collapsed ? "h-9 w-9" : "h-10 w-10"
        )}
        aria-hidden
      >
        <ListTodo className={cn(collapsed ? "h-4 w-4" : "h-5 w-5")} />
      </span>
      {!collapsed ? (
        <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-foreground">
          {APP_COMPANY_NAME}
        </span>
      ) : null}
    </Link>
  );
}
