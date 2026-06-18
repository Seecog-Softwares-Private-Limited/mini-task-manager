"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { useAuthExchange } from "@/components/auth/auth-exchange-context";

type AuthTransitionLinkProps = LinkProps & {
  className?: string;
  children: ReactNode;
};

export function AuthTransitionLink({
  href,
  className,
  children,
  ...props
}: AuthTransitionLinkProps) {
  const router = useRouter();
  const authExchange = useAuthExchange();
  const target = typeof href === "string" ? href : href.toString();

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    if (authExchange) {
      authExchange.navigateWithExchange(target);
      return;
    }
    router.push(target);
  }

  return (
    <Link href={href} className={className} onClick={onClick} {...props}>
      {children}
    </Link>
  );
}
