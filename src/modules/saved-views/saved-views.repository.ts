import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../common/utils/uuid.util';
import { SavedBoardViewEntity } from './entities/saved-board-view.entity';

@Injectable()
export class SavedViewsRepository {
  constructor(
    @InjectRepository(SavedBoardViewEntity)
    private readonly repo: Repository<SavedBoardViewEntity>,
  ) {}

  findForProject(
    organizationId: string,
    projectId: string,
    userId: string,
  ): Promise<SavedBoardViewEntity[]> {
    return this.repo
      .createQueryBuilder('v')
      .where('v.organization_id = :organizationId', { organizationId })
      .andWhere('v.project_id = :projectId', { projectId })
      .andWhere('(v.user_id = :userId OR v.is_shared = 1)', { userId })
      .orderBy('v.created_at', 'DESC')
      .getMany();
  }

  async create(data: Partial<SavedBoardViewEntity>): Promise<SavedBoardViewEntity> {
    const entity = this.repo.create({ ...data, id: data.id ?? generateUuid() });
    return this.repo.save(entity);
  }

  async delete(id: string, organizationId: string, userId: string): Promise<void> {
    await this.repo.delete({ id, organizationId, userId });
  }
}
