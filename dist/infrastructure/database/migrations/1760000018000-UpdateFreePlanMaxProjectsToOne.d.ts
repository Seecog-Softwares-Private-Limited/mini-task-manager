import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class UpdateFreePlanMaxProjectsToOne1760000018000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
