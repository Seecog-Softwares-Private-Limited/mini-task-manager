import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { SubtaskCommentEntity } from '../entities/subtask-comment.entity';

@Injectable()
export class SubtaskCommentsRepository {
  constructor(
    @InjectRepository(SubtaskCommentEntity)
    private readonly repo: Repository<SubtaskCommentEntity>,
  ) {}

  async findById(id: string): Promise<SubtaskCommentEntity | null> {
    return this.repo.findOne({ where: { id }, relations: ['user'] });
  }

  async findRootsBySubtask(
    taskId: string,
    subtaskId: string,
  ): Promise<SubtaskCommentEntity[]> {
    return this.repo.find({
      where: { taskId, subtaskId, parentId: IsNull() },
      order: { createdAt: 'ASC' },
      relations: ['user'],
    });
  }

  async findRepliesByParentIds(parentIds: string[]): Promise<SubtaskCommentEntity[]> {
    if (!parentIds.length) return [];
    return this.repo.find({
      where: { parentId: In(parentIds) },
      order: { createdAt: 'ASC' },
      relations: ['user'],
    });
  }

  async countRootsBySubtask(taskId: string, subtaskId: string): Promise<number> {
    return this.repo.count({
      where: { taskId, subtaskId, parentId: IsNull() },
    });
  }

  async create(data: Partial<SubtaskCommentEntity>): Promise<SubtaskCommentEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    return this.repo.save(entity);
  }

  async updateBody(id: string, body: string): Promise<void> {
    await this.repo.update(id, { body });
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async deleteByParentId(parentId: string): Promise<void> {
    await this.repo.delete({ parentId });
  }
}
