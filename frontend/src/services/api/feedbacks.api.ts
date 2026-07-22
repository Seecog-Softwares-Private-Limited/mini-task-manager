import { apiClient } from "@/services/api/client";
import type { Feedback, PaginatedResult } from "@/types/api";

/** Customer submit only — listing is super-admin. */
export async function createFeedback(input: {
  title: string;
  description: string;
  files?: File[];
}): Promise<Feedback> {
  const form = new FormData();
  form.append("title", input.title);
  form.append("description", input.description);
  for (const file of input.files ?? []) {
    form.append("files", file);
  }
  const { data } = await apiClient.post<Feedback>("/feedbacks", form);
  return data;
}

export async function fetchSuperAdminFeedbacks(
  page = 1,
  limit = 20
): Promise<PaginatedResult<Feedback>> {
  const { data } = await apiClient.get<PaginatedResult<Feedback>>("/super-admin/feedbacks", {
    params: { page, limit },
  });
  return data;
}

export async function openSuperAdminFeedbackMedia(
  feedbackId: string,
  mediaId: string,
  fileName: string
) {
  const { data } = await apiClient.get<Blob>(
    `/super-admin/feedbacks/${feedbackId}/media/${mediaId}`,
    { responseType: "blob" }
  );
  const url = URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noreferrer";
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
