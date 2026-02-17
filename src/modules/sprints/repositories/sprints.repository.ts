import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { SprintEntity } from '../entities/sprint.entity';

@Injectable()
export class SprintsRepository {
  constructor(
    @InjectRepository(SprintEntity)
    private readonly repo: Repository<SprintEntity>,
  ) {}

  async findById(id: string): Promise<SprintEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByProject(projectId: string): Promise<SprintEntity[]> {
    return this.repo.find({ where: { projectId }, order: { createdAt: 'DESC' } });
  }

  async create(data: Partial<SprintEntity>): Promise<SprintEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<SprintEntity>): Promise<void> {
    await this.repo.update(id, data);
  }
}
