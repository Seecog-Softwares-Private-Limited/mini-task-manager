import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubtaskCommentsTable1760000039000 implements MigrationInterface {
  name = 'CreateSubtaskCommentsTable1760000039000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`subtask_comments\` (
        \`id\` BINARY(16) NOT NULL,
        \`organization_id\` BINARY(16) NOT NULL,
        \`task_id\` BINARY(16) NOT NULL,
        \`subtask_id\` VARCHAR(36) NOT NULL,
        \`user_id\` BINARY(16) NOT NULL,
        \`body\` VARCHAR(2000) NOT NULL,
        \`parent_id\` BINARY(16) NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_subtask_comments_task_subtask\` (\`task_id\`, \`subtask_id\`, \`created_at\`),
        INDEX \`idx_subtask_comments_parent\` (\`parent_id\`),
        INDEX \`idx_subtask_comments_org\` (\`organization_id\`),
        CONSTRAINT \`fk_subtask_comments_org\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_subtask_comments_task\` FOREIGN KEY (\`task_id\`) REFERENCES \`tasks\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_subtask_comments_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`fk_subtask_comments_parent\` FOREIGN KEY (\`parent_id\`) REFERENCES \`subtask_comments\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`subtask_comments\``);
  }
}
