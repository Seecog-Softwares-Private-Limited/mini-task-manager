import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserLastSeenAt1760000004000 implements MigrationInterface {
  name = 'AddUserLastSeenAt1760000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'last_seen_at'
      LIMIT 1
    `);
    if (Array.isArray(hasColumn) && hasColumn.length > 0) return;

    await queryRunner.query(`
      ALTER TABLE \`users\`
      ADD COLUMN \`last_seen_at\` TIMESTAMP NULL AFTER \`is_active\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'last_seen_at'
      LIMIT 1
    `);
    if (Array.isArray(hasColumn) && hasColumn.length === 0) return;

    await queryRunner.query(`
      ALTER TABLE \`users\`
      DROP COLUMN \`last_seen_at\`
    `);
  }
}
