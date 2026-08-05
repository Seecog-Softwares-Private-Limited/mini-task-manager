import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOccurrenceReminderSentAt1760000040000 implements MigrationInterface {
  name = 'AddOccurrenceReminderSentAt1760000040000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'recurring_task_occurrences'
        AND COLUMN_NAME = 'reminder_sent_at'
      LIMIT 1
    `);
    if (Array.isArray(hasColumn) && hasColumn.length > 0) return;

    await queryRunner.query(`
      ALTER TABLE \`recurring_task_occurrences\`
      ADD COLUMN \`reminder_sent_at\` TIMESTAMP NULL
      COMMENT 'When ritual due reminder was sent to checklist assignees'
      AFTER \`completed_at\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'recurring_task_occurrences'
        AND COLUMN_NAME = 'reminder_sent_at'
      LIMIT 1
    `);
    if (Array.isArray(hasColumn) && hasColumn.length === 0) return;

    await queryRunner.query(`
      ALTER TABLE \`recurring_task_occurrences\`
      DROP COLUMN \`reminder_sent_at\`
    `);
  }
}
