import { Repository } from 'typeorm';
import { InvoiceEntity } from '../entities/invoice.entity';
export declare class InvoicesRepository {
    private readonly repo;
    constructor(repo: Repository<InvoiceEntity>);
    findBySubscription(subscriptionId: string): Promise<InvoiceEntity[]>;
    create(data: Partial<InvoiceEntity>): Promise<InvoiceEntity>;
}
