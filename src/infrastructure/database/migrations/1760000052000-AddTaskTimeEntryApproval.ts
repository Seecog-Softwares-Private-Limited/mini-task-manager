import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Jira-vertical prep, 5 of 7: weekly timesheet approval.
 * Time entries log today with no review step; the web timesheet screen needs
 * a manager to approve or reject a week before it's billable/exportable.
 * Existing rows default to APPROVED so nothing already logged gets stuck
 * waiting on a review that was never asked for.
 */
export class AddTaskTimeEntryApproval1760000052000 implements MigrationInterface {
  name = 'AddTaskTimeEntryApproval1760000052000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`task_time_entries\`
        ADD COLUMN \`approval_status\` VARCHAR(20) NOT NULL DEFAULT 'APPROVED' AFTER \`note\`,
        ADD COLUMN \`approved_by\` BINARY(16) NULL AFTER \`approval_status\`,
        ADD COLUMN \`approved_at\` TIMESTAMP NULL AFTER \`approved_by\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`task_time_entries\`
        ADD INDEX \`idx_time_entries_org_status\` (\`organization_id\`, \`approval_status\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`task_time_entries\` DROP INDEX \`idx_time_entries_org_status\``);
    await queryRunner.query(`
      ALTER TABLE \`task_time_entries\`
        DROP COLUMN \`approved_at\`,
        DROP COLUMN \`approved_by\`,
        DROP COLUMN \`approval_status\`
    `);
  }
}
