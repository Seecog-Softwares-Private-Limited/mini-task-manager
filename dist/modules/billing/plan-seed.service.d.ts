import { OnModuleInit } from '@nestjs/common';
import { PlansRepository } from './repositories/plans.repository';
export declare class PlanSeedService implements OnModuleInit {
    private readonly plansRepository;
    private readonly logger;
    constructor(plansRepository: PlansRepository);
    onModuleInit(): Promise<void>;
    seedPlans(): Promise<void>;
}
