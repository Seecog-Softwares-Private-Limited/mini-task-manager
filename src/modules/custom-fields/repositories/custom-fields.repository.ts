import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { CustomFieldEntity } from '../entities/custom-field.entity';

@Injectable()
export class CustomFieldsRepository {
  constructor(
    @InjectRepository(CustomFieldEntity)
    private readonly repo: Repository<CustomFieldEntity>,
  ) {}

  async findById(id: string): Promise<CustomFieldEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByProject(projectId: string): Promise<CustomFieldEntity[]> {
    return this.repo.find({ where: { projectId } });
  }

  async create(data: Partial<CustomFieldEntity>): Promise<CustomFieldEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    return this.repo.save(entity);
  }
}
