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

/** Public static files under /public — must never redirect to /login. */
function isStaticAsset(pathname: string) {
  if (
    pathname.startsWith("/branding/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon.png" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/opengraph-image.png" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/manifest.json" ||
    pathname === "/icon" ||
    pathname.startsWith("/icon/") ||
    pathname === "/apple-icon" ||
    pathname.startsWith("/apple-icon")
  ) {
    return true;
  }
  return /\.(?:png|jpe?g|gif|webp|svg|ico|txt|xml|webmanifest)$/i.test(pathname);
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // CRITICAL: Do not gate `/api/*`. Those URLs are rewritten to the Nest API (see next.config).
  // If we redirect unauthenticated `/api/v1/auth/login` to /login, the browser never reaches the
  // backend and sign-in always fails (HTML redirect instead of JSON).
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (isStaticAsset(pathname)) {
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
    // Exclude api, Next internals, brand assets, and App Router icon routes (/icon, /apple-icon).
    "/((?!api|_next/static|_next/image|favicon\\.ico|favicon\\.png|branding/|icon(?:/|$)|apple-icon|apple-touch|opengraph).*)",
  ],
};
