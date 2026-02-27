import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/invite", "/forgot-password", "/reset-password", "/verify-email", "/auth/callback"];
function isPublic(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => p !== "/" && (pathname === p || pathname.startsWith(p + "/")));
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (isPublic(pathname)) return NextResponse.next();

  const signedIn = request.cookies.get("mini_tm_signed_in")?.value === "1";
  if (!signedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
