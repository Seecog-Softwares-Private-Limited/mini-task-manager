import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskCompletedAt1760000032000 implements MigrationInterface {
  name = 'AddTaskCompletedAt1760000032000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tasks'
        AND COLUMN_NAME = 'completed_at'
      LIMIT 1
    `);
    if (Array.isArray(hasColumn) && hasColumn.length > 0) return;

    await queryRunner.query(`
      ALTER TABLE \`tasks\`
      ADD COLUMN \`completed_at\` TIMESTAMP NULL AFTER \`due_date\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tasks'
        AND COLUMN_NAME = 'completed_at'
      LIMIT 1
    `);
    if (Array.isArray(hasColumn) && hasColumn.length === 0) return;

    await queryRunner.query(`
      ALTER TABLE \`tasks\`
      DROP COLUMN \`completed_at\`
    `);
  }
}
