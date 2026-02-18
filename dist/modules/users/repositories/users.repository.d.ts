import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
export declare class UsersRepository {
    private readonly repo;
    constructor(repo: Repository<UserEntity>);
    findById(id: string): Promise<UserEntity | null>;
    findByEmail(email: string): Promise<UserEntity | null>;
    create(data: Partial<UserEntity>): Promise<UserEntity>;
    update(id: string, data: Partial<UserEntity>): Promise<void>;
    deleteById(id: string): Promise<void>;
}
