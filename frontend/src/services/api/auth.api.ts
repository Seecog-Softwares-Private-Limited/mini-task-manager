import { apiClient, setStoredToken, setStoredOrgId } from "@/services/api/client";
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

export interface PublicSignupPayload {
  email: string;
  fullName: string;
  password: string;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("auth/login", payload);
  setStoredToken(data.accessToken);
  return data;
}

export async function signup(payload: PublicSignupPayload): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>("auth/signup", payload);
  return data;
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>("auth/verify-email", { token });
  return data;
}

export async function resendVerificationEmail(email: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>("auth/resend-verification", { email });
  return data;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>("auth/forgot-password", { email });
  return data;
}

export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>("auth/reset-password", { token, password });
  return data;
}

export async function sendOtp(phone: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>("auth/send-otp", { phone });
  return data;
}

export async function verifyOtp(phone: string, code: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("auth/verify-otp", { phone, code });
  setStoredToken(data.accessToken);
  return data;
}

export async function signupWithInvite(
  payload: SignupWithInvitePayload
): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("auth/signup-with-invite", payload);
  setStoredToken(data.accessToken);
  if (data.organizationId) setStoredOrgId(data.organizationId);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post("auth/logout");
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 401) {
      // Token expired/invalid — user is effectively logged out; treat as success
      return;
    }
    throw err;
  } finally {
    setStoredToken(null);
  }
}
