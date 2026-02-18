import { Repository } from 'typeorm';
import { PaymentEntity } from '../entities/payment.entity';
export declare class PaymentsRepository {
    private readonly repo;
    constructor(repo: Repository<PaymentEntity>);
    findByInvoice(invoiceId: string): Promise<PaymentEntity[]>;
    create(data: Partial<PaymentEntity>): Promise<PaymentEntity>;
}
