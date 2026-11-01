import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { uuidBinaryTransformer } from '../../../common/base.entity';
import { EpicEntity } from '../entities/epic.entity';
import { TaskEntity } from '../../tasks/entities/task.entity';

export interface EpicTaskStats {
  taskCount: number;
  completedTaskCount: number;
}

@Injectable()
export class EpicsRepository {
  constructor(
    @InjectRepository(EpicEntity)
    private readonly repo: Repository<EpicEntity>,
  ) {}

  async findById(id: string): Promise<EpicEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIdAndOrganization(id: string, organizationId: string): Promise<EpicEntity | null> {
    return this.repo.findOne({ where: { id, organizationId } });
  }

  async findByOrganization(
    organizationId: string,
    filters?: { projectId?: string },
  ): Promise<EpicEntity[]> {
    return this.repo.find({
      where: {
        organizationId,
        ...(filters?.projectId ? { projectId: filters.projectId } : {}),
      },
      order: { createdAt: 'DESC' },
      take: 1000,
    });
  }

  async create(data: Partial<EpicEntity>): Promise<EpicEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    await this.repo.save(entity);
    return this.findById(id) as Promise<EpicEntity>;
  }

  async update(id: string, data: Partial<EpicEntity>): Promise<void> {
    await this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  /** Task count + completed count per epic, for the given epic ids. */
  async getTaskStats(epicIds: string[]): Promise<Map<string, EpicTaskStats>> {
    const stats = new Map<string, EpicTaskStats>();
    if (epicIds.length === 0) return stats;

    // uuidBinaryTransformer only applies via entity-metadata-aware query paths,
    // not to raw parameter values bound in a string where() clause - convert manually.
    const binaryIds = epicIds.map((id) => uuidBinaryTransformer.to(id));

    const rows = await this.repo.manager
      .getRepository(TaskEntity)
      .createQueryBuilder('task')
      .select('task.epicId', 'epicId')
      .addSelect('COUNT(*)', 'taskCount')
      .addSelect('SUM(CASE WHEN task.completedAt IS NOT NULL THEN 1 ELSE 0 END)', 'completedTaskCount')
      .where('task.epicId IN (:...binaryIds)', { binaryIds })
      .groupBy('task.epicId')
      .getRawMany<{ epicId: Buffer | string; taskCount: string; completedTaskCount: string }>();

    for (const row of rows) {
      const epicId = uuidBinaryTransformer.from(row.epicId);
      if (!epicId) continue;
      stats.set(epicId, {
        taskCount: Number(row.taskCount),
        completedTaskCount: Number(row.completedTaskCount),
      });
    }
    return stats;
  }
}
