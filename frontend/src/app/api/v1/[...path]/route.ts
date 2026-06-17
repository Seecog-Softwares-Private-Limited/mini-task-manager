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
function readFromRepoPropertiesEnv(key: string): string | undefined {
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
      const re = new RegExp(`^\\s*${key}\\s*=\\s*([^#\\r\\n]+)`, "m");
      const m = text.match(re);
      if (m?.[1]) return m[1].trim().replace(/^["']|["']$/g, "");
    } catch {
      /* try next */
    }
  }
  return undefined;
}

function readPortFromRepoPropertiesEnv(): string | undefined {
  return readFromRepoPropertiesEnv("PORT");
}

function upstreamBaseUrl(): string {
  if (process.env.BACKEND_INTERNAL_URL) {
    return process.env.BACKEND_INTERNAL_URL.replace(/\/$/, "");
  }
  // Set by root `app.js` or PM2 ecosystem — avoids wrong port when cwd ≠ repo layout.
  const fromEnv = process.env.MINI_TM_BACKEND_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const fromFile = readFromRepoPropertiesEnv("MINI_TM_BACKEND_URL")?.replace(/\/$/, "");
  if (fromFile) return fromFile;

  const port =
    process.env.PORT || readPortFromRepoPropertiesEnv() || "3000";
  const host = process.env.BACKEND_HOST || readFromRepoPropertiesEnv("BACKEND_HOST") || "127.0.0.1";
  return `http://${host}:${port}`;
}

function buildTargetUrl(subpath: string, search: string): string {
  const base = upstreamBaseUrl();
  const prefix = "/api/v1";
  const pathPart = subpath ? `/${subpath}` : "";
  return `${base}${prefix}${pathPart}${search}`;
}

function isUpstreamConnectionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as NodeJS.ErrnoException).code;
  if (code === "ECONNRESET" || code === "ECONNREFUSED" || code === "EPIPE" || code === "ETIMEDOUT") {
    return true;
  }
  const msg = err.message.toLowerCase();
  return (
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("socket hang up") ||
    msg.includes("fetch failed")
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function proxyUnavailableResponse(base: string, targetUrl: string, err: unknown, timedOut: boolean) {
  const upstreamTimeoutMs = 12_000;
  console.error("[mini-tm api proxy] fetch failed:", targetUrl, err);
  return NextResponse.json(
    {
      statusCode: 503,
      message: timedOut
        ? `API proxy timed out (${upstreamTimeoutMs / 1000}s) calling ${targetUrl}. Is Nest running at ${base}?`
        : `Cannot reach Nest API at ${base} (connection reset). From the repo root run: node app.js`,
    },
    { status: 503 }
  );
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
  const maxAttempts = 2;
  const base = upstreamBaseUrl();
  let upstream: Response | undefined;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), upstreamTimeoutMs);
    try {
      upstream = await fetch(targetUrl, {
        ...init,
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      break;
    } catch (err) {
      clearTimeout(timeoutId);
      lastErr = err;
      const timedOut =
        err instanceof Error &&
        (err.name === "AbortError" || err.message?.includes("aborted"));
      const retryable = isUpstreamConnectionError(err) && attempt < maxAttempts && !timedOut;
      if (retryable) {
        await sleep(250);
        continue;
      }
      return proxyUnavailableResponse(base, targetUrl, err, timedOut);
    }
  }

  if (!upstream) {
    return proxyUnavailableResponse(base, targetUrl, lastErr, false);
  }

  const outHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    outHeaders.set(key, value);
  });

  // Buffer JSON API bodies so a mid-stream ECONNRESET does not break the browser.
  if (request.method === "HEAD") {
    return new NextResponse(null, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  }

  try {
    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  } catch (err) {
    if (isUpstreamConnectionError(err)) {
      return proxyUnavailableResponse(base, targetUrl, err, false);
    }
    throw err;
  }
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
