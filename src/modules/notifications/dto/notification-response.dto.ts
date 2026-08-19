export class NotificationResponseDto {
  id!: string;
  userId!: string;
  title!: string | null;
  message!: string | null;
  /** Deep-link payload when present (taskId, subtaskId, type, …). */
  data?: Record<string, string> | null;
  isRead!: boolean;
  createdAt!: Date;
}
