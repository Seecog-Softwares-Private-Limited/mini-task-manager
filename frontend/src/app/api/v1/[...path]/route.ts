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

function buildTargetUrl(base: string, subpath: string, search: string): string {
  const prefix = "/api/v1";
  const pathPart = subpath ? `/${subpath}` : "";
  return `${base.replace(/\/$/, "")}${prefix}${pathPart}${search}`;
}

function isLocalhostHttpUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
  } catch {
    return false;
  }
}

/**
 * When local Nest shares a remote DB with production, uploads on localhost land
 * only on the Mac disk — mobile (VPS) sees broken images. Prefer the public API
 * for attachment upload + binary reads when PUBLIC_API_URL is set.
 */
function publicApiBaseUrl(): string | undefined {
  const raw =
    process.env.PUBLIC_API_URL?.trim() ||
    readFromRepoPropertiesEnv("PUBLIC_API_URL");
  if (!raw) return undefined;
  const base = raw.replace(/\/$/, "");
  if (isLocalhostHttpUrl(base)) return undefined;
  return base;
}

function preferPublicApiFor(subpath: string, method: string): boolean {
  if (!publicApiBaseUrl()) return false;
  const m = method.toUpperCase();
  if (m === "POST" && subpath === "attachments/upload") return true;
  if (m === "GET" || m === "HEAD") {
    return (
      /^attachments\/[^/]+\/(download|preview)$/.test(subpath) ||
      /^tasks\/attachments\/[^/]+\/file$/.test(subpath)
    );
  }
  return false;
}

function isAttachmentBinaryGet(subpath: string, method: string): boolean {
  const m = method.toUpperCase();
  if (m !== "GET" && m !== "HEAD") return false;
  return (
    /^attachments\/[^/]+\/(download|preview)$/.test(subpath) ||
    /^tasks\/attachments\/[^/]+\/file$/.test(subpath)
  );
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

/** Origins allowed for Flutter web (localhost) + optional CORS_ORIGIN list. */
function isAllowedCorsOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return true;
  }
  const configured = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return configured.includes(origin);
}

function applyCorsHeaders(headers: Headers, request: NextRequest): void {
  const origin = request.headers.get("origin");
  if (!origin || !isAllowedCorsOrigin(origin)) return;

  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Vary", "Origin");
  headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  const requested = request.headers.get("access-control-request-headers");
  headers.set(
    "Access-Control-Allow-Headers",
    requested ||
      "Content-Type, Authorization, X-Organization-Id",
  );
}

function proxyUnavailableResponse(base: string, targetUrl: string, err: unknown, timedOut: boolean) {
  const upstreamTimeoutMs = 45_000;
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
  const localBase = upstreamBaseUrl();
  const publicBase = publicApiBaseUrl();
  const primaryBase =
    preferPublicApiFor(subpath, request.method) && publicBase
      ? publicBase
      : localBase;
  const fallbackBase =
    isAttachmentBinaryGet(subpath, request.method) &&
    publicBase &&
    primaryBase === localBase
      ? publicBase
      : isAttachmentBinaryGet(subpath, request.method) &&
          publicBase &&
          primaryBase === publicBase
        ? localBase
        : undefined;

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

  const upstreamTimeoutMs = 45_000;
  const maxAttempts = 2;

  async function fetchUpstream(base: string): Promise<Response | NextResponse> {
    const targetUrl = buildTargetUrl(base, subpath, request.nextUrl.search);
    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), upstreamTimeoutMs);
      try {
        const upstream = await fetch(targetUrl, {
          ...init,
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return upstream;
      } catch (err) {
        clearTimeout(timeoutId);
        lastErr = err;
        const timedOut =
          err instanceof Error &&
          (err.name === "AbortError" || err.message?.includes("aborted"));
        const retryable =
          isUpstreamConnectionError(err) && attempt < maxAttempts && !timedOut;
        if (retryable) {
          await sleep(250);
          continue;
        }
        return proxyUnavailableResponse(base, targetUrl, err, timedOut);
      }
    }
    return proxyUnavailableResponse(base, buildTargetUrl(base, subpath, request.nextUrl.search), lastErr, false);
  }

  let upstream = await fetchUpstream(primaryBase);
  if (upstream instanceof NextResponse) {
    // Upload to public failed at network layer — fall back to local Nest.
    if (
      preferPublicApiFor(subpath, request.method) &&
      publicBase &&
      primaryBase === publicBase
    ) {
      const localFallback = await fetchUpstream(localBase);
      if (localFallback instanceof NextResponse) {
        return upstream;
      }
      upstream = localFallback;
    } else {
      return upstream;
    }
  }

  // Local file missing but production may have it (or the reverse after public uploads).
  if (
    fallbackBase &&
    (upstream.status === 404 || upstream.status === 410)
  ) {
    const fallback = await fetchUpstream(fallbackBase);
    if (!(fallback instanceof NextResponse)) {
      upstream = fallback;
    }
  }

  // Public upload rejected — try local so web keep working offline from VPS.
  if (
    preferPublicApiFor(subpath, request.method) &&
    publicBase &&
    primaryBase === publicBase &&
    upstream.status >= 500
  ) {
    const localFallback = await fetchUpstream(localBase);
    if (!(localFallback instanceof NextResponse)) {
      upstream = localFallback;
    }
  }

  const outHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    outHeaders.set(key, value);
  });
  // Ensure browser CORS works even if Nest headers were dropped by the hop.
  applyCorsHeaders(outHeaders, request);

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
      return proxyUnavailableResponse(
        primaryBase,
        buildTargetUrl(primaryBase, subpath, request.nextUrl.search),
        err,
        false,
      );
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

export async function OPTIONS(request: NextRequest) {
  const headers = new Headers();
  applyCorsHeaders(headers, request);
  // Preflight must succeed for Flutter web → VPS (:3000 proxy).
  if (!headers.has("Access-Control-Allow-Origin")) {
    const origin = request.headers.get("origin");
    if (origin) {
      // Still answer OPTIONS so the browser gets a clear CORS failure, not a network error.
      headers.set("Vary", "Origin");
    }
  }
  headers.set("Access-Control-Max-Age", "86400");
  return new NextResponse(null, { status: 204, headers });
}
