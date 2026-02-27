import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddPaymentsRazorpayColumns1760000013000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
