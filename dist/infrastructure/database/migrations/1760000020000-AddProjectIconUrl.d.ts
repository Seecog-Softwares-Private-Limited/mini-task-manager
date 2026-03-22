import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddProjectIconUrl1760000020000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
