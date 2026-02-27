import { Repository } from 'typeorm';
import { ApiKeyEntity } from './entities/api-key.entity';
export declare class ApiKeysRepository {
    private readonly repo;
    constructor(repo: Repository<ApiKeyEntity>);
    findByOrganization(organizationId: string): Promise<ApiKeyEntity[]>;
    findById(id: string): Promise<ApiKeyEntity | null>;
    create(data: Partial<ApiKeyEntity>): Promise<ApiKeyEntity>;
    delete(id: string): Promise<void>;
}
