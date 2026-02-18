import { UsersRepository } from './repositories/users.repository';
import { UserEntity } from './entities/user.entity';
export declare class UsersService {
    private readonly usersRepository;
    constructor(usersRepository: UsersRepository);
    findById(id: string): Promise<UserEntity | null>;
    findByEmail(email: string): Promise<UserEntity | null>;
    findByIdForAuth(id: string): Promise<{
        id: string;
        email: string;
    } | null>;
    validatePassword(userId: string, plainPassword: string): Promise<boolean>;
    create(data: {
        email: string;
        fullName: string;
        password: string;
    }): Promise<UserEntity>;
    deleteById(id: string): Promise<void>;
}
