import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Multi-industry phase 5: an Issue is a problem raised against a project (and
 * optionally a site/task/checklist item) - manually, or automatically when a
 * READING checklist item comes back out of range or a CHECK item is marked
 * failed (see TasksService.raiseIssuesForFailedChecklistItems).
 *
 * site_id has no FK to `sites` - that table (multi-industry phase 2) isn't on
 * main yet. Plain nullable column for forward-compatibility; add the FK in a
 * follow-up migration once phase 2 merges.
 */
export class CreateIssuesTable1760000059000 implements MigrationInterface {
  name = 'CreateIssuesTable1760000059000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'issues'
      LIMIT 1
    `);
    if (Array.isArray(exists) && exists.length > 0) return;

    await queryRunner.query(`
      CREATE TABLE \`issues\` (
        \`id\` BINARY(16) NOT NULL,
        \`organization_id\` BINARY(16) NOT NULL,
        \`project_id\` BINARY(16) NOT NULL,
        \`site_id\` BINARY(16) NULL,
        \`task_id\` BINARY(16) NULL,
        \`subtask_id\` VARCHAR(64) NULL,
        \`title\` VARCHAR(300) NOT NULL,
        \`description\` TEXT NULL,
        \`severity\` VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'OPEN',
        \`source\` VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
        \`raised_by\` BINARY(16) NULL,
        \`assignee_id\` BINARY(16) NULL,
        \`resolved_at\` TIMESTAMP NULL,
        \`resolved_by\` BINARY(16) NULL,
        \`resolution_note\` TEXT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_issues_org_status\` (\`organization_id\`, \`status\`),
        INDEX \`idx_issues_project_status\` (\`project_id\`, \`status\`),
        INDEX \`idx_issues_task\` (\`task_id\`),
        CONSTRAINT \`fk_issues_organization\`
          FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_issues_project\`
          FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_issues_task\`
          FOREIGN KEY (\`task_id\`) REFERENCES \`tasks\`(\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`fk_issues_raised_by\`
          FOREIGN KEY (\`raised_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`fk_issues_assignee\`
          FOREIGN KEY (\`assignee_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`fk_issues_resolved_by\`
          FOREIGN KEY (\`resolved_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'issues'
      LIMIT 1
    `);
    if (!Array.isArray(exists) || exists.length === 0) return;

    await queryRunner.query(`DROP TABLE \`issues\``);
  }
}
