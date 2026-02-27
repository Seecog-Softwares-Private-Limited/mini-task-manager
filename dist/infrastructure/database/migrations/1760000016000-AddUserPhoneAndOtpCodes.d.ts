import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddUserPhoneAndOtpCodes1760000016000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
