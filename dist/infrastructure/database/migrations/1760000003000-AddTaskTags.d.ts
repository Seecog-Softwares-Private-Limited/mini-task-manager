import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddTaskTags1760000003000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
