import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { UsersRepository } from './repositories/users.repository';
export declare class LastSeenInterceptor implements NestInterceptor {
    private readonly usersRepository;
    constructor(usersRepository: UsersRepository);
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
}
