import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddOrganizationLogoUrl1760000005000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
