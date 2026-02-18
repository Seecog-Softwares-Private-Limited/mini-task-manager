import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddUserLastSeenAt1760000004000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
