import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Large checklists (~100+ items with descriptions) exceed MySQL TEXT (64KB).
 * STRICT mode then rejects PATCH /tasks updates, so deleted subtasks appear
 * to "come back" after a failed save. MEDIUMTEXT holds up to 16MB.
 */
export class WidenTaskSubtasksToMediumtext1760000044000 implements MigrationInterface {
  name = 'WidenTaskSubtasksToMediumtext1760000044000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`tasks\`
      MODIFY COLUMN \`subtasks\` MEDIUMTEXT NULL
    `);

    const hasTemplateCol = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'recurring_task_templates'
        AND COLUMN_NAME = 'template_subtasks'
      LIMIT 1
    `);
    if (hasTemplateCol.length > 0) {
      await queryRunner.query(`
        ALTER TABLE \`recurring_task_templates\`
        MODIFY COLUMN \`template_subtasks\` MEDIUMTEXT NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`tasks\`
      MODIFY COLUMN \`subtasks\` TEXT NULL
    `);

    const hasTemplateCol = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'recurring_task_templates'
        AND COLUMN_NAME = 'template_subtasks'
      LIMIT 1
    `);
    if (hasTemplateCol.length > 0) {
      await queryRunner.query(`
        ALTER TABLE \`recurring_task_templates\`
        MODIFY COLUMN \`template_subtasks\` TEXT NULL
      `);
    }
  }
}
