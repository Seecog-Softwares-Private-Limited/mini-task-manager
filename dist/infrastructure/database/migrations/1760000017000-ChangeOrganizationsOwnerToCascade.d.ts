import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class ChangeOrganizationsOwnerToCascade1760000017000 implements MigrationInterface {
    name: string;
    private getOwnerUserFk;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
