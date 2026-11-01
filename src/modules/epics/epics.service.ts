import { Injectable, NotFoundException } from '@nestjs/common';
import { EpicsRepository, EpicTaskStats } from './repositories/epics.repository';
import { EpicEntity } from './entities/epic.entity';
import { CreateEpicDto } from './dto/create-epic.dto';
import { UpdateEpicDto } from './dto/update-epic.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class EpicsService {
  constructor(
    private readonly epicsRepository: EpicsRepository,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async findByOrganization(
    organizationId: string,
    filters?: { projectId?: string },
  ): Promise<Array<EpicEntity & EpicTaskStats>> {
    const epics = await this.epicsRepository.findByOrganization(organizationId, filters);
    const stats = await this.epicsRepository.getTaskStats(epics.map((e) => e.id));
    return epics.map((epic) => ({
      ...epic,
      taskCount: stats.get(epic.id)?.taskCount ?? 0,
      completedTaskCount: stats.get(epic.id)?.completedTaskCount ?? 0,
    }));
  }

  async findByIdInOrganization(id: string, organizationId: string): Promise<(EpicEntity & EpicTaskStats) | null> {
    const epic = await this.epicsRepository.findByIdAndOrganization(id, organizationId);
    if (!epic) return null;
    const stats = await this.epicsRepository.getTaskStats([epic.id]);
    return {
      ...epic,
      taskCount: stats.get(epic.id)?.taskCount ?? 0,
      completedTaskCount: stats.get(epic.id)?.completedTaskCount ?? 0,
    };
  }

  async create(organizationId: string, createdBy: string, dto: CreateEpicDto): Promise<EpicEntity> {
    const epic = await this.epicsRepository.create({
      organizationId,
      projectId: dto.projectId,
      title: dto.title,
      description: dto.description ?? null,
      color: dto.color ?? null,
      status: dto.status ?? 'TODO',
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      createdBy,
    });
    this.activityLogsService
      .log({ organizationId, userId: createdBy, entityType: 'epic', entityId: epic.id, action: 'create', metadata: { title: epic.title } })
      .catch(() => {});
    return epic;
  }

  async update(id: string, organizationId: string, dto: UpdateEpicDto, userId?: string): Promise<EpicEntity> {
    const epic = await this.epicsRepository.findByIdAndOrganization(id, organizationId);
    if (!epic) {
      throw new NotFoundException('Epic not found');
    }
    const payload: Partial<EpicEntity> = {};
    if (dto.title !== undefined) payload.title = dto.title;
    if (dto.description !== undefined) payload.description = dto.description ?? null;
    if (dto.color !== undefined) payload.color = dto.color ?? null;
    if (dto.status !== undefined) payload.status = dto.status;
    if (dto.startDate !== undefined) payload.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.dueDate !== undefined) payload.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (Object.keys(payload).length === 0) return epic;
    await this.epicsRepository.update(id, payload);
    const updated = await this.epicsRepository.findByIdAndOrganization(id, organizationId);
    this.activityLogsService
      .log({ organizationId, userId, entityType: 'epic', entityId: id, action: 'update', metadata: { title: updated?.title ?? epic.title } })
      .catch(() => {});
    return updated!;
  }

  async delete(id: string, organizationId: string, userId?: string): Promise<void> {
    const epic = await this.epicsRepository.findByIdAndOrganization(id, organizationId);
    if (!epic) {
      throw new NotFoundException('Epic not found');
    }
    await this.epicsRepository.delete(id);
    this.activityLogsService
      .log({ organizationId, userId, entityType: 'epic', entityId: id, action: 'delete', metadata: { title: epic.title } })
      .catch(() => {});
  }
}
