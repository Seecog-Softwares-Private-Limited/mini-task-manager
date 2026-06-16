import { z } from "zod";

export const createProjectFormSchema = z.object({
  name: z.string().min(1, "Name required").max(200),
  description: z.string().max(400_000).optional(),
  visibility: z.string().optional(),
  workspaceId: z.string().min(1, "Select a workspace"),
});

export type CreateProjectFormData = z.infer<typeof createProjectFormSchema>;
