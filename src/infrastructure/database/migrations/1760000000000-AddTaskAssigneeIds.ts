import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskAssigneeIds1760000000000 implements MigrationInterface {
  name = 'AddTaskAssigneeIds1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tasks'
        AND COLUMN_NAME = 'assignee_ids'
      LIMIT 1
    `);
    if (hasColumn.length > 0) return;

    await queryRunner.query(`
      ALTER TABLE \`tasks\`
      ADD COLUMN \`assignee_ids\` TEXT NULL AFTER \`assignee_id\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tasks'
        AND COLUMN_NAME = 'assignee_ids'
      LIMIT 1
    `);
    if (hasColumn.length === 0) return;

    await queryRunner.query(`
      ALTER TABLE \`tasks\`
      DROP COLUMN \`assignee_ids\`
    `);
  }
}

