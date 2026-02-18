import { apiClient, setStoredToken } from "@/services/api/client";
import { config } from "@/config/env";
import type { LoginResponse } from "@/types/api";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupWithInvitePayload {
  token: string;
  fullName: string;
  password: string;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>(
    `${config.apiBaseUrl}/auth/login`,
    payload
  );
  setStoredToken(data.accessToken);
  return data;
}

export async function signupWithInvite(
  payload: SignupWithInvitePayload
): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>(
    `${config.apiBaseUrl}/auth/signup-with-invite`,
    payload
  );
  setStoredToken(data.accessToken);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post(`${config.apiBaseUrl}/auth/logout`);
  } finally {
    setStoredToken(null);
  }
}
