import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { InvoiceEntity } from '../entities/invoice.entity';

@Injectable()
export class InvoicesRepository {
  constructor(
    @InjectRepository(InvoiceEntity)
    private readonly repo: Repository<InvoiceEntity>,
  ) {}

  async findBySubscription(subscriptionId: string): Promise<InvoiceEntity[]> {
    return this.repo.find({ where: { subscriptionId }, order: { issuedAt: 'DESC' } });
  }

  async create(data: Partial<InvoiceEntity>): Promise<InvoiceEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    return this.repo.save(entity);
  }
}
