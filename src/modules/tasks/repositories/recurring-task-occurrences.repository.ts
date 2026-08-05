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

  /** All occurrences for a template on a specific due date (idempotency guard). */
  async findByTemplateAndDueDate(
    templateId: string,
    dueDate: string,
  ): Promise<RecurringTaskOccurrenceEntity[]> {
    return this.repo.find({
      where: { templateId, dueDate: dueDate as unknown as Date },
    });
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

  async deleteByTemplate(templateId: string): Promise<void> {
    await this.repo.delete({ templateId });
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
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

  async findPendingByProject(
    organizationId: string,
    projectId: string,
  ): Promise<RecurringTaskOccurrenceEntity[]> {
    return this.repo.find({
      where: { organizationId, projectId, state: 'PENDING' },
      order: { dueDate: 'ASC' },
      take: 2000,
    });
  }

  /** Pending runs with a task, due in [fromYmd, toYmd]. */
  async findPendingForReminders(
    fromYmd: string,
    toYmd: string,
  ): Promise<RecurringTaskOccurrenceEntity[]> {
    return this.repo
      .createQueryBuilder('o')
      .where('o.state = :state', { state: 'PENDING' })
      .andWhere('o.task_id IS NOT NULL')
      .andWhere('o.due_date >= :fromYmd', { fromYmd })
      .andWhere('o.due_date <= :toYmd', { toYmd })
      .orderBy('o.due_date', 'ASC')
      .take(2000)
      .getMany();
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

