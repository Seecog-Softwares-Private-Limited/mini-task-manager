import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { WorkflowEntity } from '../entities/workflow.entity';

@Injectable()
export class WorkflowsRepository {
  constructor(
    @InjectRepository(WorkflowEntity)
    private readonly repo: Repository<WorkflowEntity>,
  ) {}

  async findById(id: string): Promise<WorkflowEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByProject(projectId: string): Promise<WorkflowEntity[]> {
    return this.repo.find({ where: { projectId }, order: { name: 'ASC' } });
  }

  async create(data: Partial<WorkflowEntity>): Promise<WorkflowEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    return this.repo.save(entity);
  }
}
