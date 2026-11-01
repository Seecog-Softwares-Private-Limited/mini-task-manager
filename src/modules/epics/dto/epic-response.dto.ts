export class EpicResponseDto {
  id!: string;
  organizationId!: string;
  projectId!: string;
  title!: string;
  description?: string;
  color?: string;
  status!: string;
  startDate?: string;
  dueDate?: string;
  createdBy!: string;
  createdAt!: string;
  updatedAt!: string;
  /** Total tasks linked to this epic. */
  taskCount!: number;
  /** Tasks linked to this epic with completedAt set. */
  completedTaskCount!: number;
}
