import axios from "axios";
import type { ApiErrorBody } from "@/types/api";

/** Normalized error from backend or network. */
export interface NormalizedError {
  message: string;
  statusCode?: number;
  isNetwork: boolean;
  isRateLimited: boolean;
}

/** Thrown by {@link login} when email/password sign-in fails (non-Axios). */
export class LoginRequestError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly isNetwork = false
  ) {
    super(message);
    this.name = "LoginRequestError";
  }
}

/** Normalize backend error shape { statusCode, message }. Message can be string or string[]. */
export function normalizeApiError(err: unknown): NormalizedError {
  if (err instanceof LoginRequestError) {
    return {
      message: err.message,
      statusCode: err.statusCode,
      isNetwork: err.isNetwork,
      isRateLimited: err.statusCode === 429,
    };
  }
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data as ApiErrorBody | undefined;
    const message = data?.message;
    const messageStr = Array.isArray(message) ? message.join(", ") : typeof message === "string" ? message : undefined;
    const isCanceled = err.code === "ERR_CANCELED";
    const isNetwork = !err.response && !isCanceled;
    const code = err.code ?? "";
    const raw = (err.message ?? "").toLowerCase();
    const connectionLost =
      isNetwork &&
      (code === "ECONNRESET" ||
        code === "ECONNREFUSED" ||
        code === "ERR_NETWORK" ||
        raw.includes("econnreset") ||
        raw.includes("network error") ||
        raw.includes("socket hang up"));
    return {
      message: connectionLost
        ? "Cannot reach the server. Start the backend from the repo root: node app.js"
        : messageStr ?? err.message ?? "Request failed",
      statusCode: status ?? (connectionLost ? 503 : undefined),
      isNetwork: connectionLost || isNetwork,
      isRateLimited: status === 429,
    };
  }
  if (err instanceof Error) {
    return { message: err.message, isNetwork: false, isRateLimited: false };
  }
  return { message: "An error occurred", isNetwork: false, isRateLimited: false };
}

export function isNetworkError(err: unknown): boolean {
  return axios.isAxiosError(err) && !err.response;
}
