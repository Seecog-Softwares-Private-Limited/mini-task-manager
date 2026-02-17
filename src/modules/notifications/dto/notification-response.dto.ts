export class NotificationResponseDto {
  id!: string;
  userId!: string;
  title!: string | null;
  message!: string | null;
  isRead!: boolean;
  createdAt!: Date;
}
