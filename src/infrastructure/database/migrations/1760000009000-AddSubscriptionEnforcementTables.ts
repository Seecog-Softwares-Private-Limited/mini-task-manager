import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionEnforcementTables1760000009000 implements MigrationInterface {
  name = 'AddSubscriptionEnforcementTables1760000009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add max_storage_mb and max_api_keys to plans (Init has max_projects, max_members only)
    try {
      await queryRunner.query(`ALTER TABLE \`plans\` ADD COLUMN \`max_storage_mb\` INT NULL`);
    } catch { /* column may exist */ }
    try {
      await queryRunner.query(`ALTER TABLE \`plans\` ADD COLUMN \`max_api_keys\` INT NULL`);
    } catch { /* column may exist */ }

    // Add file_size_bytes to task_attachments for storage tracking
    try {
      await queryRunner.query(
        `ALTER TABLE \`task_attachments\` ADD COLUMN \`file_size_bytes\` BIGINT NULL DEFAULT 0`,
      );
    } catch { /* column may exist */ }

    // Create api_keys table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`api_keys\` (
        \`id\` BINARY(16) NOT NULL,
        \`organization_id\` BINARY(16) NOT NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`key_hash\` VARCHAR(255) NOT NULL,
        \`key_prefix\` VARCHAR(16) NOT NULL,
        \`created_by\` BINARY(16) NOT NULL,
        \`last_used_at\` TIMESTAMP NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_api_keys_organization_id\` (\`organization_id\`),
        CONSTRAINT \`fk_api_keys_org\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_api_keys_creator\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`api_keys\``);
    try {
      await queryRunner.query(`ALTER TABLE \`task_attachments\` DROP COLUMN \`file_size_bytes\``);
    } catch { /* ignore */ }
    try {
      await queryRunner.query(`ALTER TABLE \`plans\` DROP COLUMN \`max_api_keys\``);
    } catch { /* ignore */ }
    try {
      await queryRunner.query(`ALTER TABLE \`plans\` DROP COLUMN \`max_storage_mb\``);
    } catch { /* ignore */ }
  }
}
