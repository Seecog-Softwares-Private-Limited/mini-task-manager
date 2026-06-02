import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlanConfigurationsTable1760000024000 implements MigrationInterface {
  name = 'CreatePlanConfigurationsTable1760000024000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`plan_configurations\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`plan_name\` VARCHAR(20) NOT NULL,
        \`max_users\` INT UNSIGNED NULL,
        \`max_storage\` BIGINT UNSIGNED NOT NULL,
        \`max_workspaces\` INT UNSIGNED NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`ux_plan_configurations_plan_name\` (\`plan_name\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Seed with the exact values previously hardcoded in plans.config.ts
    await queryRunner.query(`
      INSERT INTO \`plan_configurations\` (\`plan_name\`, \`max_users\`, \`max_storage\`, \`max_workspaces\`)
      VALUES
        ('free', 5, 524288000, 1),
        ('silver', 20, 2147483648, 1),
        ('gold', NULL, 4294967296, 10)
      ON DUPLICATE KEY UPDATE
        \`max_users\` = VALUES(\`max_users\`),
        \`max_storage\` = VALUES(\`max_storage\`),
        \`max_workspaces\` = VALUES(\`max_workspaces\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `plan_configurations`');
  }
}

