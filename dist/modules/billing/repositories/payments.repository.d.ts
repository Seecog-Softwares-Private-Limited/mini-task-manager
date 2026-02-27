import { Repository } from 'typeorm';
import { PaymentEntity } from '../entities/payment.entity';
export declare class PaymentsRepository {
    private readonly repo;
    constructor(repo: Repository<PaymentEntity>);
    findBySubscription(subscriptionId: string): Promise<PaymentEntity[]>;
    findByRazorpayPaymentId(razorpayPaymentId: string): Promise<PaymentEntity | null>;
    findByRazorpayOrderId(razorpayOrderId: string): Promise<PaymentEntity | null>;
    create(data: Partial<PaymentEntity>): Promise<PaymentEntity>;
    save(entity: PaymentEntity): Promise<PaymentEntity>;
}
