import axios, { AxiosError } from "axios";
import { config } from "@/config/env";
import { normalizeApiError } from "@/lib/error";
import { reportGlobalError } from "@/lib/global-error-handler";
import type { ApiErrorBody } from "@/types/api";

const TOKEN_KEY = "mini_tm_token";
const ORG_KEY = "mini_tm_org_id";
const AUTH_COOKIE = "mini_tm_signed_in";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setAuthCookie(signedIn: boolean) {
  if (typeof document === "undefined") return;
  if (signedIn) document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=604800; SameSite=Lax`;
  else document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
}

/** Centralized logout: clear token, cookie, and org. Call on 401 or explicit logout. */
export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ORG_KEY);
  setAuthCookie(false);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    setAuthCookie(true);
  } else {
    clearAuth();
  }
}

export function getStoredOrgId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ORG_KEY);
}

export function setStoredOrgId(orgId: string | null): void {
  if (typeof window === "undefined") return;
  if (orgId) localStorage.setItem(ORG_KEY, orgId);
  else localStorage.removeItem(ORG_KEY);
}

export const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((req) => {
  const token = getStoredToken();
  const orgId = getStoredOrgId();
  if (token) req.headers.Authorization = `Bearer ${token}`;
  if (orgId) req.headers["X-Organization-Id"] = orgId;
  return req;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err: AxiosError<ApiErrorBody>) => {
    const status = err.response?.status;
    const url = err.config?.url ?? "";

    const isPublicAuthRequest =
      url.includes("/auth/login") ||
      url.includes("/auth/logout") ||
      url.includes("/auth/signup-with-invite") ||
      url.includes("/invitations/validate");
    if (status === 401 && !isPublicAuthRequest) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:sessionExpired"));
      }
    } else if (status === 403) {
      const msg = (err.response?.data as { message?: string | string[] })?.message;
      const msgStr = Array.isArray(msg) ? msg[0] : msg;
      if (
        typeof msgStr === "string" &&
        (msgStr.includes("Organization context") || msgStr.includes("not a member of this organization"))
      ) {
        if (typeof window !== "undefined") {
          localStorage.removeItem(ORG_KEY);
          window.dispatchEvent(new CustomEvent("auth:orgInvalid"));
        }
      }
    }
    const msg = (err.response?.data as { message?: string | string[] })?.message;
    const msgStr = Array.isArray(msg) ? msg[0] : msg;
    if (status !== 403 || typeof msgStr !== "string" || (!msgStr.includes("Organization context") && !msgStr.includes("not a member"))) {
      const normalized = normalizeApiError(err);
      if (normalized.statusCode && normalized.statusCode >= 500) reportGlobalError(normalized);
      else if (normalized.isRateLimited) reportGlobalError(normalized);
      else if (normalized.isNetwork) reportGlobalError(normalized);
    }
    return Promise.reject(err);
  }
);

export function parseApiError(err: unknown): string {
  return normalizeApiError(err).message;
}

export function isRateLimited(err: unknown): boolean {
  return normalizeApiError(err).isRateLimited;
}
