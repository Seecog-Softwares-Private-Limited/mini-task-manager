import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Jira-vertical prep, 3 of 7: epics as a grouping above sprint/task.
 * Powers the roadmap (web + mobile) and the backlog's epic swimlanes.
 */
export class CreateEpicsTable1760000050000 implements MigrationInterface {
  name = 'CreateEpicsTable1760000050000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`epics\` (
        \`id\` BINARY(16) NOT NULL,
        \`organization_id\` BINARY(16) NOT NULL,
        \`project_id\` BINARY(16) NOT NULL,
        \`title\` VARCHAR(300) NOT NULL,
        \`description\` TEXT NULL,
        \`color\` VARCHAR(20) NULL,
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'TODO',
        \`start_date\` DATE NULL,
        \`due_date\` DATE NULL,
        \`created_by\` BINARY(16) NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_epics_project\` (\`project_id\`, \`status\`),
        INDEX \`idx_epics_org\` (\`organization_id\`),
        CONSTRAINT \`fk_epics_org\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_epics_project\` FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_epics_created_by\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`epics\``);
  }
}
