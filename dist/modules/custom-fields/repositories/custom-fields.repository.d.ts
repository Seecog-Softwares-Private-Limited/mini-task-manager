import { Repository } from 'typeorm';
import { CustomFieldEntity } from '../entities/custom-field.entity';
export declare class CustomFieldsRepository {
    private readonly repo;
    constructor(repo: Repository<CustomFieldEntity>);
    findById(id: string): Promise<CustomFieldEntity | null>;
    findByProject(projectId: string): Promise<CustomFieldEntity[]>;
    create(data: Partial<CustomFieldEntity>): Promise<CustomFieldEntity>;
}
