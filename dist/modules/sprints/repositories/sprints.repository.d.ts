import { Repository } from 'typeorm';
import { SprintEntity } from '../entities/sprint.entity';
export declare class SprintsRepository {
    private readonly repo;
    constructor(repo: Repository<SprintEntity>);
    findById(id: string): Promise<SprintEntity | null>;
    findByProject(projectId: string): Promise<SprintEntity[]>;
    create(data: Partial<SprintEntity>): Promise<SprintEntity>;
    update(id: string, data: Partial<SprintEntity>): Promise<void>;
}
