import axios from "axios";
import type { ApiErrorBody } from "@/types/api";

/** Normalized error from backend or network. */
export interface NormalizedError {
  message: string;
  statusCode?: number;
  isNetwork: boolean;
  isRateLimited: boolean;
}

/** Normalize backend error shape { statusCode, message }. Message can be string or string[]. */
export function normalizeApiError(err: unknown): NormalizedError {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data as ApiErrorBody | undefined;
    const message = data?.message;
    const messageStr = Array.isArray(message) ? message.join(", ") : typeof message === "string" ? message : undefined;
    return {
      message: messageStr ?? err.message ?? "Request failed",
      statusCode: status,
      isNetwork: !err.response,
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
