import { apiClient } from "@/services/api/client";

export async function downloadWorkspaceExport(): Promise<Blob> {
  const { data } = await apiClient.get<Blob>("/export/csv", { responseType: "blob" });
  return data;
}
