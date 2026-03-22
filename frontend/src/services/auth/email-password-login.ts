/**
 * Email/password sign-in using same-origin fetch → Next.js rewrites → API.
 * Avoids cross-origin/CORS and bad NEXT_PUBLIC_API_URL values (e.g. pointing at the frontend port).
 */
import { setStoredOrgId, setStoredToken } from "@/services/api/client";
import type { LoginResponse } from "@/types/api";

export type EmailPasswordLoginResult =
  | { ok: true; data: LoginResponse }
  | { ok: false; message: string; status?: number; network: boolean };

function loginUrl(): string {
  if (typeof window === "undefined") {
    return "/api/v1/auth/login";
  }
  return `${window.location.origin}/api/v1/auth/login`;
}

export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<EmailPasswordLoginResult> {
  const body = {
    email: email.trim().toLowerCase(),
    password,
  };

  const controller = new AbortController();
  const loginTimeoutMs = 25000;
  const timeoutId = setTimeout(() => controller.abort(), loginTimeoutMs);

  let res: Response;
  try {
    res = await fetch(loginUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === "AbortError") {
      return {
        ok: false,
        network: true,
        message: `Sign-in timed out after ${loginTimeoutMs / 1000}s. Is the API running on PORT from properties.env? Try restarting: node app.js`,
      };
    }
    return {
      ok: false,
      network: true,
      message:
        "Cannot reach the API. From the repo root run the backend on the port in properties.env (e.g. node app.js or npm run start:dev) and open the app on the Next.js port so /api/v1 is proxied.",
    };
  }

  clearTimeout(timeoutId);

  const raw = await res.text();
  let data: unknown = {};
  const trimmed = raw.trimStart();
  if (trimmed.startsWith("<!") || trimmed.toLowerCase().includes("<html")) {
    return {
      ok: false,
      network: false,
      message:
        "Got HTML instead of JSON from /api (usually Next middleware redirected the request). /api/* must not require the session cookie.",
    };
  }
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      data = JSON.parse(raw) as unknown;
    } catch {
      data = {};
    }
  }

  const payload = data as {
    accessToken?: string;
    user?: LoginResponse["user"];
    organizationId?: string;
    message?: string | string[];
  };

  if (!res.ok) {
    const msg = payload.message;
    const text = Array.isArray(msg) ? msg.join(", ") : typeof msg === "string" ? msg : res.statusText;
    return {
      ok: false,
      network: false,
      status: res.status,
      message: text || "Sign in failed",
    };
  }

  if (!payload.accessToken || !payload.user) {
    return {
      ok: false,
      network: false,
      message: "Invalid response from server (missing token).",
    };
  }

  const loginResponse: LoginResponse = {
    accessToken: payload.accessToken,
    user: payload.user,
    organizationId: payload.organizationId,
  };

  setStoredToken(loginResponse.accessToken);
  if (loginResponse.organizationId) {
    setStoredOrgId(loginResponse.organizationId);
  }

  return { ok: true, data: loginResponse };
}
