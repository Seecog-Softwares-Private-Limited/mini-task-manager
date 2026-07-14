import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailChangePendingEmail1760000035000 implements MigrationInterface {
  name = 'AddEmailChangePendingEmail1760000035000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'email_verification_tokens'
        AND COLUMN_NAME = 'pending_email'
      LIMIT 1
    `);
    if (Array.isArray(hasColumn) && hasColumn.length > 0) return;

    await queryRunner.query(`
      ALTER TABLE \`email_verification_tokens\`
      ADD COLUMN \`pending_email\` VARCHAR(150) NULL
      COMMENT 'Target email for change-email flow; null for signup verification'
      AFTER \`user_id\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'email_verification_tokens'
        AND COLUMN_NAME = 'pending_email'
      LIMIT 1
    `);
    if (Array.isArray(hasColumn) && hasColumn.length === 0) return;

    await queryRunner.query(`
      ALTER TABLE \`email_verification_tokens\`
      DROP COLUMN \`pending_email\`
    `);
  }
}
