import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class EnsurePlanSlugColumn1760000019000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(): Promise<void>;
}
