"use client";

import { createContext, useContext } from "react";

type AuthExchangeContextValue = {
  navigateWithExchange: (href: string) => void;
};

export const AuthExchangeContext = createContext<AuthExchangeContextValue | null>(null);

export function useAuthExchange() {
  return useContext(AuthExchangeContext);
}
