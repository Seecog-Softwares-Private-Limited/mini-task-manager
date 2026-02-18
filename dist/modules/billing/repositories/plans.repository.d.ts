import { Repository } from 'typeorm';
import { PlanEntity } from '../entities/plan.entity';
export declare class PlansRepository {
    private readonly repo;
    constructor(repo: Repository<PlanEntity>);
    findById(id: string): Promise<PlanEntity | null>;
    findActive(): Promise<PlanEntity[]>;
}
