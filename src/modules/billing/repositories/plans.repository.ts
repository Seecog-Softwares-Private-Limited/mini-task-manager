import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryDeepPartialEntity } from 'typeorm';
import { PlanEntity } from '../entities/plan.entity';

@Injectable()
export class PlansRepository {
  constructor(
    @InjectRepository(PlanEntity)
    private readonly repo: Repository<PlanEntity>,
  ) {}

  async findById(id: string): Promise<PlanEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<PlanEntity | null> {
    return this.repo.findOne({ where: { slug } });
  }

  async findActive(): Promise<PlanEntity[]> {
    return this.repo.find({ where: { isActive: true }, order: { displayOrder: 'ASC' } });
  }

  async findAll(): Promise<PlanEntity[]> {
    return this.repo.find({ order: { displayOrder: 'ASC' } });
  }

  async save(entity: PlanEntity): Promise<PlanEntity> {
    return this.repo.save(entity);
  }

  async upsert(data: Partial<PlanEntity>): Promise<void> {
    await this.repo.upsert(data as QueryDeepPartialEntity<PlanEntity>, ['slug']);
  }
}
