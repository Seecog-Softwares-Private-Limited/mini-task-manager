import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddSubscriptionEnforcementTables1760000009000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
