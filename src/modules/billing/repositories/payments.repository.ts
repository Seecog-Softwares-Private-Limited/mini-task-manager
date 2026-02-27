import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { PaymentEntity } from '../entities/payment.entity';

@Injectable()
export class PaymentsRepository {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly repo: Repository<PaymentEntity>,
  ) {}

  async findBySubscription(subscriptionId: string): Promise<PaymentEntity[]> {
    return this.repo.find({ where: { subscriptionId }, order: { createdAt: 'DESC' } });
  }

  async findByRazorpayPaymentId(razorpayPaymentId: string): Promise<PaymentEntity | null> {
    return this.repo.findOne({ where: { razorpayPaymentId } });
  }

  async findByRazorpayOrderId(razorpayOrderId: string): Promise<PaymentEntity | null> {
    return this.repo.findOne({ where: { razorpayOrderId } });
  }

  async create(data: Partial<PaymentEntity>): Promise<PaymentEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    return this.repo.save(entity);
  }

  async save(entity: PaymentEntity): Promise<PaymentEntity> {
    return this.repo.save(entity);
  }
}
