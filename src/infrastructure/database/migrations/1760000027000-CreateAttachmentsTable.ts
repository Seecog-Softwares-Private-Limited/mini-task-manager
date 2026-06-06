import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAttachmentsTable1760000027000 implements MigrationInterface {
  name = 'CreateAttachmentsTable1760000027000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`attachments\` (
        \`id\` BINARY(16) NOT NULL,
        \`workspace_id\` BINARY(16) NOT NULL,
        \`project_id\` BINARY(16) NOT NULL,
        \`task_id\` BINARY(16) NULL,
        \`entity_type\` VARCHAR(20) NOT NULL,
        \`entity_id\` VARCHAR(36) NOT NULL,
        \`original_file_name\` VARCHAR(255) NULL,
        \`stored_file_name\` VARCHAR(255) NOT NULL,
        \`mime_type\` VARCHAR(127) NULL,
        \`file_extension\` VARCHAR(32) NULL,
        \`file_size\` BIGINT NULL DEFAULT 0,
        \`storage_provider\` VARCHAR(32) NOT NULL DEFAULT 'local',
        \`storage_key\` TEXT NOT NULL,
        \`thumbnail_url\` TEXT NULL,
        \`preview_url\` TEXT NULL,
        \`uploaded_by\` BINARY(16) NOT NULL,
        \`is_deleted\` TINYINT(1) NOT NULL DEFAULT 0,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` TIMESTAMP NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_attachments_entity\` (\`entity_type\`, \`entity_id\`, \`is_deleted\`),
        INDEX \`idx_attachments_task\` (\`task_id\`, \`is_deleted\`),
        CONSTRAINT \`fk_attachments_workspace\` FOREIGN KEY (\`workspace_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_attachments_project\` FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_attachments_task\` FOREIGN KEY (\`task_id\`) REFERENCES \`tasks\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_attachments_user\` FOREIGN KEY (\`uploaded_by\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`attachments\``);
  }
}
