import { Injectable, NotFoundException } from '@nestjs/common';
import { IssuesRepository } from './repositories/issues.repository';
import { IssueEntity } from './entities/issue.entity';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class IssuesService {
  constructor(
    private readonly issuesRepository: IssuesRepository,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async findByOrganization(
    organizationId: string,
    filters?: { projectId?: string; status?: string },
  ): Promise<IssueEntity[]> {
    return this.issuesRepository.findByOrganization(organizationId, filters);
  }

  async findByIdInOrganization(id: string, organizationId: string): Promise<IssueEntity | null> {
    return this.issuesRepository.findByIdAndOrganization(id, organizationId);
  }

  async create(organizationId: string, raisedBy: string, dto: CreateIssueDto): Promise<IssueEntity> {
    const issue = await this.issuesRepository.create({
      organizationId,
      projectId: dto.projectId,
      siteId: dto.siteId ?? null,
      taskId: dto.taskId ?? null,
      subtaskId: dto.subtaskId ?? null,
      title: dto.title,
      description: dto.description ?? null,
      severity: dto.severity ?? 'MEDIUM',
      status: 'OPEN',
      source: 'MANUAL',
      raisedBy,
      assigneeId: dto.assigneeId ?? null,
    });
    this.activityLogsService
      .log({ organizationId, userId: raisedBy, entityType: 'issue', entityId: issue.id, action: 'create', metadata: { title: issue.title } })
      .catch(() => {});
    return issue;
  }

  /**
   * Auto-raises an issue from a failed CHECK item or an out-of-range READING,
   * found while completing a task's checklist (see TasksService.update).
   * No raisedBy - the system raised it, not a person.
   */
  async createFromChecklistItem(params: {
    organizationId: string;
    projectId: string;
    taskId: string;
    subtaskId: string;
    title: string;
    description?: string;
    source: 'AUTO_CHECK_FAILED' | 'AUTO_READING_OUT_OF_RANGE';
  }): Promise<IssueEntity> {
    const issue = await this.issuesRepository.create({
      organizationId: params.organizationId,
      projectId: params.projectId,
      taskId: params.taskId,
      subtaskId: params.subtaskId,
      title: params.title,
      description: params.description ?? null,
      severity: 'HIGH',
      status: 'OPEN',
      source: params.source,
      raisedBy: null,
    });
    this.activityLogsService
      .log({ organizationId: params.organizationId, entityType: 'issue', entityId: issue.id, action: 'create', metadata: { title: issue.title, source: params.source } })
      .catch(() => {});
    return issue;
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateIssueDto,
    userId?: string,
  ): Promise<IssueEntity> {
    const issue = await this.issuesRepository.findByIdAndOrganization(id, organizationId);
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }
    const payload: Partial<IssueEntity> = {};
    if (dto.title !== undefined) payload.title = dto.title;
    if (dto.description !== undefined) payload.description = dto.description ?? null;
    if (dto.severity !== undefined) payload.severity = dto.severity;
    if (dto.assigneeId !== undefined) {
      const v = dto.assigneeId.trim();
      payload.assigneeId = v.length === 0 ? null : v;
    }
    if (dto.resolutionNote !== undefined) payload.resolutionNote = dto.resolutionNote ?? null;
    if (dto.status !== undefined) {
      payload.status = dto.status;
      const resolving = dto.status === 'RESOLVED' || dto.status === 'CLOSED';
      const wasResolved = issue.status === 'RESOLVED' || issue.status === 'CLOSED';
      if (resolving && !wasResolved) {
        payload.resolvedAt = new Date();
        payload.resolvedBy = userId ?? null;
      } else if (!resolving && wasResolved) {
        payload.resolvedAt = null;
        payload.resolvedBy = null;
      }
    }
    if (Object.keys(payload).length === 0) return issue;
    await this.issuesRepository.update(id, payload);
    const updated = await this.issuesRepository.findByIdAndOrganization(id, organizationId);
    this.activityLogsService
      .log({ organizationId, userId: userId ?? undefined, entityType: 'issue', entityId: id, action: 'update', metadata: { title: updated?.title ?? issue.title } })
      .catch(() => {});
    return updated!;
  }
}
