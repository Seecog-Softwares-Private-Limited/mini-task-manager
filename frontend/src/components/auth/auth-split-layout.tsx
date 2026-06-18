"use client";

import { useCallback, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthBrandPanel } from "@/components/auth/premium-auth-shell";
import { AuthExchangeContext } from "@/components/auth/auth-exchange-context";

export function AuthSplitLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isSignup = pathname.startsWith("/signup");
  const dataCy = isSignup ? "signup-page" : "login-page";

  const navigateWithExchange = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router]
  );

  return (
    <AuthExchangeContext.Provider value={{ navigateWithExchange }}>
      <div
        className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-2"
        data-cy={dataCy}
        data-auth-shell
      >
        <aside className="auth-split-brand relative hidden min-h-screen items-center justify-center border-r border-border/60 px-10 py-12 lg:flex lg:px-14 xl:px-20">
          <div className="w-full max-w-[320px]">
            <AuthBrandPanel />
          </div>
        </aside>

        <main className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-14 xl:px-20">
          <div className="w-full max-w-[400px]">{children}</div>
        </main>
      </div>
    </AuthExchangeContext.Provider>
  );
}
