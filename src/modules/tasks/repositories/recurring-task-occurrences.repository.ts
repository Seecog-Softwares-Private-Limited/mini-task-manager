import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { RecurringTaskOccurrenceEntity } from '../entities/recurring-task-occurrence.entity';

@Injectable()
export class RecurringTaskOccurrencesRepository {
  constructor(
    @InjectRepository(RecurringTaskOccurrenceEntity)
    private readonly repo: Repository<RecurringTaskOccurrenceEntity>,
  ) {}

  async create(data: Partial<RecurringTaskOccurrenceEntity>): Promise<RecurringTaskOccurrenceEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    await this.repo.save(entity);
    return this.findById(id) as Promise<RecurringTaskOccurrenceEntity>;
  }

  async findById(id: string): Promise<RecurringTaskOccurrenceEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByTaskId(taskId: string): Promise<RecurringTaskOccurrenceEntity | null> {
    return this.repo.findOne({ where: { taskId } });
  }

  async findByTemplateAndSequence(
    templateId: string,
    sequenceNumber: number,
  ): Promise<RecurringTaskOccurrenceEntity | null> {
    return this.repo.findOne({ where: { templateId, sequenceNumber } });
  }

  async update(id: string, patch: Partial<RecurringTaskOccurrenceEntity>): Promise<void> {
    await this.repo.update(id, patch);
  }

  async findByTemplate(templateId: string): Promise<RecurringTaskOccurrenceEntity[]> {
    return this.repo.find({
      where: { templateId },
      order: { sequenceNumber: 'DESC' },
      take: 500,
    });
  }

  async markPreviousPendingCompleted(
    templateId: string,
    upToSequence: number,
    completedAt: Date,
  ): Promise<void> {
    await this.repo.update(
      {
        templateId,
        sequenceNumber: LessThanOrEqual(upToSequence),
        state: 'PENDING',
      },
      {
        state: 'COMPLETED',
        completedAt,
      },
    );
  }

  async statsByOrganization(organizationId: string, projectId?: string): Promise<RecurringTaskOccurrenceEntity[]> {
    return this.repo.find({
      where: {
        organizationId,
        ...(projectId ? { projectId } : {}),
      },
      order: { dueDate: 'DESC' },
      take: 5000,
    });
  }
}

