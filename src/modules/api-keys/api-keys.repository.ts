import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../common/utils/uuid.util';
import { ApiKeyEntity } from './entities/api-key.entity';

@Injectable()
export class ApiKeysRepository {
  constructor(
    @InjectRepository(ApiKeyEntity)
    private readonly repo: Repository<ApiKeyEntity>,
  ) {}

  async findByOrganization(organizationId: string): Promise<ApiKeyEntity[]> {
    return this.repo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<ApiKeyEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(data: Partial<ApiKeyEntity>): Promise<ApiKeyEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    return this.repo.save(entity);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
