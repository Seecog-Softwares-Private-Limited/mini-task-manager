import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFeedbacksTable1760000038000 implements MigrationInterface {
  name = 'CreateFeedbacksTable1760000038000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'feedbacks'
      LIMIT 1
    `);
    if (Array.isArray(exists) && exists.length > 0) return;

    await queryRunner.query(`
      CREATE TABLE \`feedbacks\` (
        \`id\` BINARY(16) NOT NULL,
        \`organization_id\` BINARY(16) NOT NULL,
        \`user_id\` BINARY(16) NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`description\` TEXT NOT NULL,
        \`media\` JSON NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_feedbacks_org_created\` (\`organization_id\`, \`created_at\`),
        INDEX \`idx_feedbacks_user_created\` (\`user_id\`, \`created_at\`),
        CONSTRAINT \`fk_feedbacks_organization\`
          FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_feedbacks_user\`
          FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'feedbacks'
      LIMIT 1
    `);
    if (!Array.isArray(exists) || exists.length === 0) return;

    await queryRunner.query(`DROP TABLE \`feedbacks\``);
  }
}
