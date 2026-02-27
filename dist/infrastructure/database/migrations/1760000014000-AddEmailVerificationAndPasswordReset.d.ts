import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddEmailVerificationAndPasswordReset1760000014000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
