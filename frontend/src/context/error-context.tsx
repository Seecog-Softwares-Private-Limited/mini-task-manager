"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { NormalizedError } from "@/lib/error";
import { setGlobalErrorHandler } from "@/lib/global-error-handler";

type ErrorContextValue = {
  error: NormalizedError | null;
  setError: (err: NormalizedError | null) => void;
  clearError: () => void;
};

const ErrorContext = createContext<ErrorContextValue | null>(null);

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<NormalizedError | null>(null);
  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    setGlobalErrorHandler(setError);
    return () => setGlobalErrorHandler(null);
  }, []);

  return (
    <ErrorContext.Provider value={{ error, setError, clearError }}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useGlobalError() {
  const ctx = useContext(ErrorContext);
  if (!ctx) throw new Error("useGlobalError must be used within ErrorProvider");
  return ctx;
}
