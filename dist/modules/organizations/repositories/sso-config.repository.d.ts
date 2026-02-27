import { Repository } from 'typeorm';
import { SSOConfigEntity } from '../entities/sso-config.entity';
export declare class SSOConfigRepository {
    private readonly repo;
    constructor(repo: Repository<SSOConfigEntity>);
    findByOrganization(organizationId: string): Promise<SSOConfigEntity | null>;
    upsert(organizationId: string, data: Partial<SSOConfigEntity>): Promise<SSOConfigEntity>;
    remove(organizationId: string): Promise<void>;
}
