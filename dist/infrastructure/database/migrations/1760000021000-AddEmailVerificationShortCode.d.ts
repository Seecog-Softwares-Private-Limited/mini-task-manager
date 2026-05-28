import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddEmailVerificationShortCode1760000021000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
