import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddSSOConfigAndPlanUpgrade1760000010000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
