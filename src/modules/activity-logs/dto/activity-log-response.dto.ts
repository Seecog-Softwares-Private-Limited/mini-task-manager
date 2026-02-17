export class ActivityLogResponseDto {
  id!: string;
  organizationId!: string;
  userId!: string | null;
  entityType!: string;
  entityId!: string | null;
  action!: string;
  metadata!: Record<string, unknown> | null;
  createdAt!: Date;
}
