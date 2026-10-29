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
  assigneeIds?: string[];
  dueDate?: string;
  status?: string;
  priority?: string;
  statusId?: string;
  requireLocation?: boolean;
  completionRecord?: Record<string, unknown>;
  /** Checklist item kind; undefined/CHECK = plain checkbox. */
  itemType?: 'CHECK' | 'PHOTO' | 'READING';
  /** READING items: acceptable value range and unit label. */
  minValue?: number;
  maxValue?: number;
  unit?: string;
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
  /** User who last updated the task. */
  updatedBy?: string;
  /** When assignees were last changed. */
  assigneesUpdatedAt?: Date | null;
  parentTaskId?: string;
  storyPoints?: number;
  dueDate?: string;
  /** Optional local time HH:mm when dueDate is set. */
  dueTime?: string | null;
  completedAt?: Date | null;
  estimatedMinutes?: number;
  loggedMinutes!: number;
  sprintId?: string;
  recurringTemplateId?: string;
  recurrenceType?: string;
  recurrenceSequence?: number;
  tags?: Array<{ name: string; color: string }>;
  subtasks?: TaskSubtaskResponseDto[];
  createdAt!: Date;
  updatedAt!: Date;
}
