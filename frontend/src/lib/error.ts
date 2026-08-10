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

const FALLBACK = "Something went wrong. Please try again.";

function friendlyHttpMessage(status?: number): string | undefined {
  switch (status) {
    case 400:
    case 422:
      return "Please check your input and try again.";
    case 401:
      return "Your session expired. Please sign in again.";
    case 403:
      return "You do not have permission to do that.";
    case 404:
      return "We could not find what you were looking for.";
    case 408:
    case 504:
      return "The request timed out. Please try again.";
    case 409:
      return "That conflicts with existing data. Please refresh and try again.";
    case 413:
      return "That file is too large to upload.";
    case 429:
      return "Too many requests. Please wait and try again.";
    case 500:
    case 502:
    case 503:
      return "Something went wrong on our side. Please try again.";
    default:
      return undefined;
  }
}

function looksTechnical(text: string): boolean {
  const lower = text.toLowerCase();
  if (/socketexception|dioexception|econnrefused|econnreset|xmlhttprequest/i.test(text)) {
    return true;
  }
  if (/queryfailed|databaseerror|unknown column|\ber_\w+|sqlmessage/i.test(text)) {
    return true;
  }
  if (/duplicate entry.*for key/i.test(text)) return true;
  if (/\bat\s+Object\.|\.ts:\d+|stack trace/i.test(text)) return true;
  if (/\bmust be a (uuid|string|number|boolean|email|date)\b/i.test(text)) return true;
  if (/\bshould not exist\b|\bmust be an? (array|object|integer)\b/i.test(text)) {
    return true;
  }
  if (/^[a-zA-Z0-9_.[\]]+\s+(must|should)\b/.test(text)) return true;
  if (/^cannot (get|post|patch|delete) /i.test(text)) return true;
  if (/x-organization-id|nestjs|typeorm/i.test(text)) return true;
  if (lower.includes("internal server error")) return true;
  return false;
}

/** Turn Nest / validator / SQL text into plain language for the UI. */
export function sanitizeUserFacingMessage(
  raw: string | undefined,
  statusCode?: number
): string {
  if (!raw?.trim()) {
    return friendlyHttpMessage(statusCode) ?? FALLBACK;
  }
  let text = raw.trim().replace(/^(Error|Exception):\s*/i, "");
  if (!text) return friendlyHttpMessage(statusCode) ?? FALLBACK;

  const lower = text.toLowerCase();
  if (looksTechnical(text)) {
    return friendlyHttpMessage(statusCode) ?? FALLBACK;
  }

  switch (lower) {
    case "bad request":
    case "bad request.":
      return "Please check your input and try again.";
    case "unauthorized":
    case "unauthorized.":
      return "Your session expired. Please sign in again.";
    case "forbidden":
    case "forbidden.":
      return "You do not have permission to do that.";
    case "not found":
    case "not found.":
      return "We could not find what you were looking for.";
    case "internal server error":
    case "internal server error.":
      return "Something went wrong on our side. Please try again.";
  }

  if (text.length > 180) {
    return `${text.slice(0, 177).trimEnd()}…`;
  }
  return text;
}

/** Normalize backend error shape { statusCode, message }. Message can be string or string[]. */
export function normalizeApiError(err: unknown): NormalizedError {
  if (err instanceof LoginRequestError) {
    return {
      message: sanitizeUserFacingMessage(err.message, err.statusCode),
      statusCode: err.statusCode,
      isNetwork: err.isNetwork,
      isRateLimited: err.statusCode === 429,
    };
  }
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data as ApiErrorBody | undefined;
    const message = data?.message;
    const messageStr = Array.isArray(message)
      ? message.filter((m): m is string => typeof m === "string").join(" ")
      : typeof message === "string"
        ? message
        : undefined;
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
        ? "Cannot reach the server. Check your connection and try again."
        : sanitizeUserFacingMessage(messageStr ?? err.message, status),
      statusCode: status ?? (connectionLost ? 503 : undefined),
      isNetwork: connectionLost || isNetwork,
      isRateLimited: status === 429,
    };
  }
  if (err instanceof Error) {
    return {
      message: sanitizeUserFacingMessage(err.message),
      isNetwork: false,
      isRateLimited: false,
    };
  }
  return { message: FALLBACK, isNetwork: false, isRateLimited: false };
}

export function isNetworkError(err: unknown): boolean {
  return axios.isAxiosError(err) && !err.response;
}
