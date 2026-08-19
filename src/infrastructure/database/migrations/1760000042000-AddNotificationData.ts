import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationData1760000042000 implements MigrationInterface {
  name = 'AddNotificationData1760000042000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'notifications'
        AND COLUMN_NAME = 'data'
      LIMIT 1
    `);
    if (Array.isArray(hasColumn) && hasColumn.length > 0) return;

    await queryRunner.query(`
      ALTER TABLE \`notifications\`
      ADD COLUMN \`data\` JSON NULL
      COMMENT 'Deep-link payload (taskId, subtaskId, type, …)'
      AFTER \`message\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'notifications'
        AND COLUMN_NAME = 'data'
      LIMIT 1
    `);
    if (Array.isArray(hasColumn) && hasColumn.length === 0) return;

    await queryRunner.query(`
      ALTER TABLE \`notifications\`
      DROP COLUMN \`data\`
    `);
  }
}
