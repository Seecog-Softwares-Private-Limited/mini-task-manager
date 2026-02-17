import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async findActive(): Promise<PlanEntity[]> {
    return this.repo.find({ where: { isActive: true } });
  }
}
