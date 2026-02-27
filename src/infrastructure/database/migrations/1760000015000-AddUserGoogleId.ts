import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserGoogleId1760000015000 implements MigrationInterface {
  name = 'AddUserGoogleId1760000015000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
      ADD COLUMN \`google_id\` VARCHAR(64) NULL UNIQUE AFTER \`password_hash\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`google_id\``);
  }
}
