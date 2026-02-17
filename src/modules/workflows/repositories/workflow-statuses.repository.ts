import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { WorkflowStatusEntity } from '../entities/workflow-status.entity';

@Injectable()
export class WorkflowStatusesRepository {
  constructor(
    @InjectRepository(WorkflowStatusEntity)
    private readonly repo: Repository<WorkflowStatusEntity>,
  ) {}

  async findByWorkflow(workflowId: string): Promise<WorkflowStatusEntity[]> {
    return this.repo.find({ where: { workflowId }, order: { position: 'ASC' } });
  }

  async findById(id: string): Promise<WorkflowStatusEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(data: Partial<WorkflowStatusEntity>): Promise<WorkflowStatusEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    return this.repo.save(entity);
  }
}
