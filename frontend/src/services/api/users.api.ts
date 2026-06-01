import { apiClient } from "@/services/api/client";
import type { User } from "@/types/api";

/** Current user profile (includes avatarUrl when set). */
export type CurrentUserProfile = Pick<
  User,
  "id" | "fullName" | "email" | "avatarUrl" | "isEmailVerified" | "isActive" | "isPlatformAdmin"
>;

export async function fetchCurrentUserProfile(): Promise<CurrentUserProfile | null> {
  const { data } = await apiClient.get<CurrentUserProfile | null>("users/me");
  return data;
}

export async function uploadMyAvatar(file: File): Promise<CurrentUserProfile> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<CurrentUserProfile>("users/me/avatar", form);
  return data;
}

export async function deleteMyAvatar(): Promise<void> {
  await apiClient.delete("users/me/avatar");
}
