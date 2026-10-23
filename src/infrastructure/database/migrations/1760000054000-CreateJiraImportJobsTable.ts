import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Jira-vertical prep, 7 of 7: tracks an in-progress "switch from Jira" import.
 * One row per import attempt so the web import screen can show live progress,
 * resume/retry, and keep an error log instead of a one-shot script with no record.
 */
export class CreateJiraImportJobsTable1760000054000 implements MigrationInterface {
  name = 'CreateJiraImportJobsTable1760000054000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`jira_import_jobs\` (
        \`id\` BINARY(16) NOT NULL,
        \`organization_id\` BINARY(16) NOT NULL,
        \`project_id\` BINARY(16) NOT NULL,
        \`created_by\` BINARY(16) NOT NULL,
        \`source_type\` VARCHAR(20) NOT NULL,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        \`mapping_config\` JSON NULL,
        \`imported_counts\` JSON NULL,
        \`error_log\` TEXT NULL,
        \`started_at\` TIMESTAMP NULL,
        \`completed_at\` TIMESTAMP NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_jira_import_jobs_org_status\` (\`organization_id\`, \`status\`),
        INDEX \`idx_jira_import_jobs_project\` (\`project_id\`),
        CONSTRAINT \`fk_jira_import_jobs_org\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_jira_import_jobs_project\` FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_jira_import_jobs_created_by\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`jira_import_jobs\``);
  }
}
