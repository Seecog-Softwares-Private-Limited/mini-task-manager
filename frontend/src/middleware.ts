import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isPublic(pathname: string) {
  // Keep this middleware edge-safe and deterministic:
  // no dynamic code generation (eval / new Function), no heavy imports.
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/invite" ||
    pathname.startsWith("/invite/") ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/verify-email" ||
    pathname === "/auth/callback" ||
    pathname.startsWith("/auth/callback/") ||
    pathname === "/super-admin/login"
  );
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // CRITICAL: Do not gate `/api/*`. Those URLs are rewritten to the Nest API (see next.config).
  // If we redirect unauthenticated `/api/v1/auth/login` to /login, the browser never reaches the
  // backend and sign-in always fails (HTML redirect instead of JSON).
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (isPublic(pathname)) return NextResponse.next();

  const signedIn = request.cookies.get("mini_tm_signed_in")?.value === "1";
  if (!signedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Exclude api (proxied to backend), static assets, and images — same reasons as early return above.
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
