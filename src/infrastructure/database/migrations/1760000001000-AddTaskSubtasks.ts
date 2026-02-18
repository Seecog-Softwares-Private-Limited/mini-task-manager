import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskSubtasks1760000001000 implements MigrationInterface {
  name = 'AddTaskSubtasks1760000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tasks'
        AND COLUMN_NAME = 'subtasks'
      LIMIT 1
    `);
    if (hasColumn.length > 0) return;

    await queryRunner.query(`
      ALTER TABLE \`tasks\`
      ADD COLUMN \`subtasks\` TEXT NULL AFTER \`assignee_ids\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tasks'
        AND COLUMN_NAME = 'subtasks'
      LIMIT 1
    `);
    if (hasColumn.length === 0) return;

    await queryRunner.query(`
      ALTER TABLE \`tasks\`
      DROP COLUMN \`subtasks\`
    `);
  }
}

