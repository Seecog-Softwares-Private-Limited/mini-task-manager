import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SSOConfigEntity } from '../entities/sso-config.entity';
import { generateUuid } from '../../../common/utils/uuid.util';

@Injectable()
export class SSOConfigRepository {
  constructor(
    @InjectRepository(SSOConfigEntity)
    private readonly repo: Repository<SSOConfigEntity>,
  ) {}

  async findByOrganization(organizationId: string): Promise<SSOConfigEntity | null> {
    return this.repo.findOne({ where: { organizationId } });
  }

  async upsert(organizationId: string, data: Partial<SSOConfigEntity>): Promise<SSOConfigEntity> {
    const existing = await this.findByOrganization(organizationId);
    if (existing) {
      Object.assign(existing, data);
      return this.repo.save(existing);
    }
    const entity = this.repo.create({
      ...data,
      id: generateUuid(),
      organizationId,
    });
    return this.repo.save(entity);
  }

  async remove(organizationId: string): Promise<void> {
    await this.repo.delete({ organizationId });
  }
}
