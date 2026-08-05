import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOccurrenceRemindersSent1760000041000 implements MigrationInterface {
  name = 'AddOccurrenceRemindersSent1760000041000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'recurring_task_occurrences'
        AND COLUMN_NAME = 'reminders_sent'
      LIMIT 1
    `);
    if (Array.isArray(hasColumn) && hasColumn.length > 0) return;

    await queryRunner.query(`
      ALTER TABLE \`recurring_task_occurrences\`
      ADD COLUMN \`reminders_sent\` JSON NULL
      COMMENT 'Keys of ritual/checklist reminders already pushed'
      AFTER \`reminder_sent_at\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'recurring_task_occurrences'
        AND COLUMN_NAME = 'reminders_sent'
      LIMIT 1
    `);
    if (Array.isArray(hasColumn) && hasColumn.length === 0) return;

    await queryRunner.query(`
      ALTER TABLE \`recurring_task_occurrences\`
      DROP COLUMN \`reminders_sent\`
    `);
  }
}
