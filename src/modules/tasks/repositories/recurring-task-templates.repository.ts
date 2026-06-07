import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { RecurringTaskTemplateEntity } from '../entities/recurring-task-template.entity';

@Injectable()
export class RecurringTaskTemplatesRepository {
  constructor(
    @InjectRepository(RecurringTaskTemplateEntity)
    private readonly repo: Repository<RecurringTaskTemplateEntity>,
  ) {}

  async create(data: Partial<RecurringTaskTemplateEntity>): Promise<RecurringTaskTemplateEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    await this.repo.save(entity);
    return this.findById(id) as Promise<RecurringTaskTemplateEntity>;
  }

  async findById(id: string): Promise<RecurringTaskTemplateEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIdAndOrganization(id: string, organizationId: string): Promise<RecurringTaskTemplateEntity | null> {
    return this.repo.findOne({ where: { id, organizationId } });
  }

  async update(id: string, patch: Partial<RecurringTaskTemplateEntity>): Promise<void> {
    await this.repo.update(id, patch as any);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async findDueTemplates(todayYmd: string): Promise<RecurringTaskTemplateEntity[]> {
    return this.repo.find({
      where: {
        isPaused: false,
        nextDueDate: LessThanOrEqual(todayYmd as unknown as Date),
      },
      order: { nextDueDate: 'ASC', updatedAt: 'ASC' },
      take: 500,
    });
  }

  async findByOrganization(
    organizationId: string,
    projectId?: string,
  ): Promise<RecurringTaskTemplateEntity[]> {
    return this.repo.find({
      where: {
        organizationId,
        ...(projectId ? { projectId } : {}),
      },
      order: { updatedAt: 'DESC' },
      take: 1000,
    });
  }
}

