import { Repository } from 'typeorm';
import { ActivityLogEntity } from '../entities/activity-log.entity';
export declare class ActivityLogsRepository {
    private readonly repo;
    constructor(repo: Repository<ActivityLogEntity>);
    findByOrganization(organizationId: string, page: number, limit: number): Promise<[ActivityLogEntity[], number]>;
    create(data: Partial<ActivityLogEntity>): Promise<ActivityLogEntity>;
}
