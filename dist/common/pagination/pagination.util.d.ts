import { PaginatedResult } from './pagination.dto';
export declare function paginate<T>(data: T[], total: number, page: number, limit: number): PaginatedResult<T>;
export declare function getSkip(page: number, limit: number): number;
