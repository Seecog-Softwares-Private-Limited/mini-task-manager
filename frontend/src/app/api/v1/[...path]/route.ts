import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

/** Headers that must not be forwarded to/from upstream (Node fetch). */
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

/**
 * Find PORT in repo-root properties.env. Tries several cwd layouts (frontend/, standalone/, etc.).
 */
function readPortFromRepoPropertiesEnv(): string | undefined {
  const candidates = [
    path.join(process.cwd(), "..", "properties.env"),
    path.join(process.cwd(), "..", "..", "properties.env"),
    path.join(process.cwd(), "..", "..", "..", "properties.env"),
    path.join(process.cwd(), "properties.env"),
  ];
  for (const envPath of candidates) {
    try {
      if (!fs.existsSync(envPath)) continue;
      const text = fs.readFileSync(envPath, "utf8");
      const m = text.match(/^\s*PORT\s*=\s*(\d+)/m);
      if (m?.[1]) return m[1];
    } catch {
      /* try next */
    }
  }
  return undefined;
}

function upstreamBaseUrl(): string {
  if (process.env.BACKEND_INTERNAL_URL) {
    return process.env.BACKEND_INTERNAL_URL.replace(/\/$/, "");
  }
  // Set by root `app.js` when starting Next — avoids wrong port when cwd ≠ repo layout.
  if (process.env.MINI_TM_BACKEND_URL) {
    return process.env.MINI_TM_BACKEND_URL.replace(/\/$/, "");
  }
  const port =
    process.env.PORT || readPortFromRepoPropertiesEnv() || "3000";
  const host = process.env.BACKEND_HOST || "127.0.0.1";
  return `http://${host}:${port}`;
}

function buildTargetUrl(subpath: string, search: string): string {
  const base = upstreamBaseUrl();
  const prefix = "/api/v1";
  const pathPart = subpath ? `/${subpath}` : "";
  return `${base}${prefix}${pathPart}${search}`;
}

async function proxy(request: NextRequest, pathSegments: string[] | undefined) {
  const subpath = (pathSegments ?? []).join("/");
  const targetUrl = buildTargetUrl(subpath, request.nextUrl.search);

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const l = key.toLowerCase();
    if (HOP_BY_HOP.has(l) || l === "host") return;
    headers.set(key, value);
  });

  const init: RequestInit = {
    method: request.method,
    headers,
    // Pass 3xx Location to the browser (do not follow redirects server-side).
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    const buf = await request.arrayBuffer();
    if (buf.byteLength > 0) {
      init.body = buf;
    }
  }

  const upstreamTimeoutMs = 12_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), upstreamTimeoutMs);

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const base = upstreamBaseUrl();
    const isAbort =
      err instanceof Error &&
      (err.name === "AbortError" || err.message?.includes("aborted"));
    console.error("[mini-tm api proxy] fetch failed:", targetUrl, err);
    return NextResponse.json(
      {
        statusCode: 503,
        message: isAbort
          ? `API proxy timed out (${upstreamTimeoutMs / 1000}s) calling ${targetUrl}. Is Nest running at ${base}?`
          : `Cannot reach Nest API at ${base}. Start the backend (node app.js) or set MINI_TM_BACKEND_URL / BACKEND_INTERNAL_URL.`,
      },
      { status: 503 }
    );
  }
  clearTimeout(timeoutId);

  const outHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    outHeaders.set(key, value);
  });

  if (upstream.body) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  }

  return new NextResponse(null, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}

type RouteCtx = { params: { path?: string[] } };

export async function GET(request: NextRequest, ctx: RouteCtx) {
  return proxy(request, ctx.params.path);
}

export async function POST(request: NextRequest, ctx: RouteCtx) {
  return proxy(request, ctx.params.path);
}

export async function PUT(request: NextRequest, ctx: RouteCtx) {
  return proxy(request, ctx.params.path);
}

export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  return proxy(request, ctx.params.path);
}

export async function DELETE(request: NextRequest, ctx: RouteCtx) {
  return proxy(request, ctx.params.path);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
