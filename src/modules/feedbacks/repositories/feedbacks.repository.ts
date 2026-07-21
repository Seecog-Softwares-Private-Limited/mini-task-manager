import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getSkip } from '../../../common/pagination';
import { generateUuid } from '../../../common/utils/uuid.util';
import { FeedbackEntity } from '../entities/feedback.entity';

@Injectable()
export class FeedbacksRepository {
  constructor(
    @InjectRepository(FeedbackEntity)
    private readonly repo: Repository<FeedbackEntity>,
  ) {}

  async findById(id: string, organizationId: string): Promise<FeedbackEntity | null> {
    return this.repo.findOne({
      where: { id, organizationId },
      relations: ['user'],
    });
  }

  async findByOrganization(
    organizationId: string,
    page: number,
    limit: number,
  ): Promise<[FeedbackEntity[], number]> {
    return this.repo.findAndCount({
      where: { organizationId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: getSkip(page, limit),
      take: limit,
    });
  }

  async create(data: Partial<FeedbackEntity>): Promise<FeedbackEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    const saved = await this.repo.save(entity);
    return (await this.findById(saved.id, saved.organizationId)) ?? saved;
  }
}
