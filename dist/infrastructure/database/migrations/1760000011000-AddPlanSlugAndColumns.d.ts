import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddPlanSlugAndColumns1760000011000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
