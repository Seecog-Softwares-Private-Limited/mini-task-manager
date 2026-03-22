import { Repository } from 'typeorm';
import { PlanEntity } from '../entities/plan.entity';
export declare class PlansRepository {
    private readonly repo;
    constructor(repo: Repository<PlanEntity>);
    findById(id: string): Promise<PlanEntity | null>;
    findBySlug(slug: string): Promise<PlanEntity | null>;
    findActive(): Promise<PlanEntity[]>;
    findAll(): Promise<PlanEntity[]>;
    save(entity: PlanEntity): Promise<PlanEntity>;
    upsert(data: Partial<PlanEntity>): Promise<void>;
}
