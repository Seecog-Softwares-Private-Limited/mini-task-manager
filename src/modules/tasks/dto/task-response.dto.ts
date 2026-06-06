export class TaskAssigneeResponseDto {
  id!: string;
  fullName!: string;
  email!: string;
  avatarUrl?: string;
}

export class TaskSubtaskResponseDto {
  id!: string;
  title!: string;
  completed!: boolean;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  priority?: string;
  statusId?: string;
}

export class TaskResponseDto {
  id!: string;
  projectId!: string;
  organizationId!: string;
  title!: string;
  description?: string;
  statusId?: string;
  priority!: string;
  assigneeId?: string;
  assigneeIds?: string[];
  assignee?: TaskAssigneeResponseDto;
  reporterId!: string;
  parentTaskId?: string;
  storyPoints?: number;
  dueDate?: Date;
  estimatedMinutes?: number;
  loggedMinutes!: number;
  sprintId?: string;
  tags?: Array<{ name: string; color: string }>;
  subtasks?: TaskSubtaskResponseDto[];
  createdAt!: Date;
  updatedAt!: Date;
}
