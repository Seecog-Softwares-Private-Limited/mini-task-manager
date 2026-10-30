import { IssueSeverity, IssueSource, IssueStatus } from '../entities/issue.entity';

export class IssueResponseDto {
  id!: string;
  organizationId!: string;
  projectId!: string;
  siteId?: string | null;
  taskId?: string | null;
  subtaskId?: string | null;
  title!: string;
  description?: string | null;
  severity!: IssueSeverity;
  status!: IssueStatus;
  source!: IssueSource;
  raisedBy?: string | null;
  assigneeId?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolutionNote?: string | null;
  createdAt!: string;
  updatedAt!: string;
}
