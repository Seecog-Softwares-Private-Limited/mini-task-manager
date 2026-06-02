import { apiClient, setStoredToken } from "@/services/api/client";
import type { LoginPayload } from "@/services/api/auth.api";

export async function superAdminLogin(payload: LoginPayload) {
  const { data } = await apiClient.post("auth/super-admin/login", payload);
  if (data?.accessToken) setStoredToken(data.accessToken);
  return data;
}

export async function fetchSuperAdminDashboard() {
  const { data } = await apiClient.get("/super-admin/dashboard");
  return data;
}

export async function fetchSuperAdminTenants(params?: Record<string, string | number | undefined>) {
  const { data } = await apiClient.get("/super-admin/tenants", { params });
  return data;
}

export async function fetchSuperAdminTenantById(id: string) {
  const { data } = await apiClient.get(`/super-admin/tenants/${id}`);
  return data;
}

export async function setSuperAdminTenantStatus(id: string, status: "ACTIVE" | "SUSPENDED", reason?: string) {
  const { data } = await apiClient.patch(`/super-admin/tenants/${id}/status`, { status, reason });
  return data;
}

export async function fetchSuperAdminUsers(params?: Record<string, string | number | undefined>) {
  const { data } = await apiClient.get("/super-admin/users", { params });
  return data;
}

export async function setSuperAdminUserActive(id: string, active: boolean) {
  const { data } = await apiClient.patch(`/super-admin/users/${id}/active`, { active });
  return data;
}

export async function deleteSuperAdminUser(id: string) {
  const { data } = await apiClient.delete(`/super-admin/users/${id}`);
  return data;
}

export async function fetchSuperAdminPlans() {
  const { data } = await apiClient.get("/super-admin/plans");
  return data;
}

export async function upsertSuperAdminPlan(payload: Record<string, unknown>) {
  const { data } = await apiClient.post("/super-admin/plans", payload);
  return data;
}

export async function fetchSuperAdminSubscriptions() {
  const { data } = await apiClient.get("/super-admin/subscriptions");
  return data;
}

export async function updateSuperAdminSubscription(payload: Record<string, unknown>) {
  const { data } = await apiClient.post("/super-admin/subscriptions/action", payload);
  return data;
}

export async function fetchSuperAdminAuditLogs(params?: Record<string, string | number | undefined>) {
  const { data } = await apiClient.get("/super-admin/audit-logs", { params });
  return data;
}

export async function fetchSuperAdminAnalytics() {
  const { data } = await apiClient.get("/super-admin/analytics");
  return data;
}

export async function fetchSuperAdminSettings() {
  const { data } = await apiClient.get("/super-admin/settings");
  return data;
}

export async function upsertSuperAdminSetting(settingKey: string, settingValue: unknown) {
  const { data } = await apiClient.post("/super-admin/settings", { settingKey, settingValue });
  return data;
}

export async function sendSuperAdminNotification(payload: {
  targetScope: "single" | "multiple" | "all";
  targetOrganizationIds?: string[];
  title: string;
  message: string;
}) {
  const { data } = await apiClient.post("/super-admin/notifications", payload);
  return data;
}

export async function startImpersonation(payload: { targetUserId: string; targetOrganizationId?: string; reason?: string }) {
  const { data } = await apiClient.post("/super-admin/impersonation/start", payload);
  return data as { sessionId: string; token: string };
}

export async function stopImpersonation(sessionId: string) {
  const { data } = await apiClient.post("/super-admin/impersonation/stop", { sessionId });
  return data;
}

