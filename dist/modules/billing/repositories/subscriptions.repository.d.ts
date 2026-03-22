import { Repository } from 'typeorm';
import { SubscriptionEntity } from '../entities/subscription.entity';
export declare class SubscriptionsRepository {
    private readonly repo;
    constructor(repo: Repository<SubscriptionEntity>);
    findByOrganization(organizationId: string): Promise<SubscriptionEntity | null>;
    findByRazorpaySubscriptionId(razorpaySubId: string): Promise<SubscriptionEntity | null>;
    findExpiredTrials(): Promise<SubscriptionEntity[]>;
    create(data: Partial<SubscriptionEntity>): Promise<SubscriptionEntity>;
    save(entity: SubscriptionEntity): Promise<SubscriptionEntity>;
}
