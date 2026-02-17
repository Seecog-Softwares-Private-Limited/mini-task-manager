export class TaskResponseDto {
  id!: string;
  projectId!: string;
  organizationId!: string;
  title!: string;
  description?: string;
  statusId?: string;
  priority!: string;
  assigneeId?: string;
  reporterId!: string;
  parentTaskId?: string;
  storyPoints?: number;
  dueDate?: Date;
  estimatedMinutes?: number;
  loggedMinutes!: number;
  sprintId?: string;
  createdAt!: Date;
  updatedAt!: Date;
}
