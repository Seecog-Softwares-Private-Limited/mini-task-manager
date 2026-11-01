import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Multi-industry phase 4: optional manager approval on a recurring checklist
 * run (e.g. a restaurant closing checklist, a hospital ward round) before it
 * counts as officially done. Nullable/default-false - existing templates and
 * occurrences are unaffected until a template opts in.
 */
export class AddRecurringApprovalWorkflow1760000058000 implements MigrationInterface {
  name = 'AddRecurringApprovalWorkflow1760000058000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`recurring_task_templates\`
        ADD COLUMN \`requires_approval\` BOOLEAN NOT NULL DEFAULT FALSE AFTER \`is_paused\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`recurring_task_occurrences\`
        ADD COLUMN \`submitted_at\` TIMESTAMP NULL AFTER \`completed_at\`,
        ADD COLUMN \`reviewed_at\` TIMESTAMP NULL AFTER \`submitted_at\`,
        ADD COLUMN \`reviewed_by\` BINARY(16) NULL AFTER \`reviewed_at\`,
        ADD COLUMN \`review_decision\` VARCHAR(20) NULL AFTER \`reviewed_by\`,
        ADD COLUMN \`review_note\` TEXT NULL AFTER \`review_decision\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`recurring_task_occurrences\`
        ADD CONSTRAINT \`fk_recurring_occ_reviewed_by\`
          FOREIGN KEY (\`reviewed_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`recurring_task_occurrences\` DROP FOREIGN KEY \`fk_recurring_occ_reviewed_by\``,
    );
    await queryRunner.query(`
      ALTER TABLE \`recurring_task_occurrences\`
        DROP COLUMN \`review_note\`,
        DROP COLUMN \`review_decision\`,
        DROP COLUMN \`reviewed_by\`,
        DROP COLUMN \`reviewed_at\`,
        DROP COLUMN \`submitted_at\`
    `);
    await queryRunner.query(
      `ALTER TABLE \`recurring_task_templates\` DROP COLUMN \`requires_approval\``,
    );
  }
}
