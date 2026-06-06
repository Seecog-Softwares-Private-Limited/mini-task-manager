import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { AttachmentEntity, AttachmentEntityType } from '../entities/attachment.entity';

@Injectable()
export class AttachmentsRepository {
  constructor(
    @InjectRepository(AttachmentEntity)
    private readonly repo: Repository<AttachmentEntity>,
  ) {}

  async findByEntity(entityType: AttachmentEntityType, entityId: string): Promise<AttachmentEntity[]> {
    return this.repo.find({
      where: { entityType, entityId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<AttachmentEntity | null> {
    return this.repo.findOne({ where: { id, isDeleted: false } });
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.update(id, { isDeleted: true, deletedAt: new Date() });
  }

  async create(data: Partial<AttachmentEntity>): Promise<AttachmentEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    return this.repo.save(entity);
  }
}
