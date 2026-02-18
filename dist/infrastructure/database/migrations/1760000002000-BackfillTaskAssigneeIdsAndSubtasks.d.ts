import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class BackfillTaskAssigneeIdsAndSubtasks1760000002000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(_queryRunner: QueryRunner): Promise<void>;
}
