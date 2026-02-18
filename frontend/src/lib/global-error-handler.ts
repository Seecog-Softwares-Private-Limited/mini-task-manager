import type { NormalizedError } from "./error";

/** Module-level callback for global API errors (set by ErrorProvider). Avoids passing React context into axios. */
let globalErrorHandler: ((err: NormalizedError) => void) | null = null;

export function setGlobalErrorHandler(handler: ((err: NormalizedError) => void) | null) {
  globalErrorHandler = handler;
}

export function getGlobalErrorHandler() {
  return globalErrorHandler;
}

export function reportGlobalError(err: NormalizedError) {
  if (globalErrorHandler) globalErrorHandler(err);
}
