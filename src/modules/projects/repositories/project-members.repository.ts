import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { ProjectMemberEntity } from '../entities/project-member.entity';

@Injectable()
export class ProjectMembersRepository {
  constructor(
    @InjectRepository(ProjectMemberEntity)
    private readonly repo: Repository<ProjectMemberEntity>,
  ) {}

  async findByProject(projectId: string): Promise<ProjectMemberEntity[]> {
    return this.repo.find({ where: { projectId } });
  }

  async findByProjectWithUser(projectId: string): Promise<ProjectMemberEntity[]> {
    return this.repo.find({
      where: { projectId },
      relations: ['user'],
      order: { id: 'ASC' },
    });
  }

  async findByProjectAndUser(projectId: string, userId: string): Promise<ProjectMemberEntity | null> {
    return this.repo.findOne({ where: { projectId, userId } });
  }

  async create(data: Partial<ProjectMemberEntity>): Promise<ProjectMemberEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    return this.repo.save(entity);
  }

  async updateRole(id: string, role: string): Promise<void> {
    await this.repo.update(id, { role });
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async findById(id: string): Promise<ProjectMemberEntity | null> {
    return this.repo.findOne({ where: { id }, relations: ['user'] });
  }
}
