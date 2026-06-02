import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSuperAdminPortalTables1760000025000 implements MigrationInterface {
  name = 'CreateSuperAdminPortalTables1760000025000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`super_admins\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`user_id\` BINARY(16) NOT NULL,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`ux_super_admins_user_id\` (\`user_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_super_admins_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`platform_settings\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`setting_key\` VARCHAR(120) NOT NULL,
        \`setting_value\` JSON NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`ux_platform_settings_key\` (\`setting_key\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`tenant_usage\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`organization_id\` BINARY(16) NOT NULL,
        \`period_date\` DATE NOT NULL,
        \`users_count\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`workspaces_count\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`projects_count\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`tasks_count\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`storage_used_bytes\` BIGINT UNSIGNED NOT NULL DEFAULT 0,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`idx_tenant_usage_org_period\` (\`organization_id\`, \`period_date\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_tenant_usage_org\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`notification_logs\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`target_scope\` VARCHAR(30) NOT NULL,
        \`target_organization_ids\` JSON NULL,
        \`title\` VARCHAR(200) NOT NULL,
        \`message\` TEXT NOT NULL,
        \`sent_by\` BINARY(16) NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_notification_logs_sent_by\` FOREIGN KEY (\`sent_by\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`impersonation_logs\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`session_id\` VARCHAR(64) NOT NULL,
        \`admin_user_id\` BINARY(16) NOT NULL,
        \`target_user_id\` BINARY(16) NOT NULL,
        \`target_organization_id\` BINARY(16) NULL,
        \`reason\` VARCHAR(300) NULL,
        \`started_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`ended_at\` TIMESTAMP NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`ux_impersonation_logs_session_id\` (\`session_id\`),
        KEY \`idx_impersonation_logs_admin_started\` (\`admin_user_id\`, \`started_at\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_impersonation_admin\` FOREIGN KEY (\`admin_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_impersonation_target_user\` FOREIGN KEY (\`target_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_impersonation_target_org\` FOREIGN KEY (\`target_organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`global_audit_logs\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`organization_id\` BINARY(16) NULL,
        \`actor_user_id\` BINARY(16) NULL,
        \`entity_type\` VARCHAR(80) NOT NULL,
        \`entity_id\` VARCHAR(120) NULL,
        \`action\` VARCHAR(100) NOT NULL,
        \`metadata\` JSON NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY \`idx_global_audit_org_created\` (\`organization_id\`, \`created_at\`),
        KEY \`idx_global_audit_actor_created\` (\`actor_user_id\`, \`created_at\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_global_audit_org\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`fk_global_audit_actor\` FOREIGN KEY (\`actor_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      ALTER TABLE \`plans\`
      ADD COLUMN \`max_tasks\` INT NULL,
      ADD COLUMN \`trial_days\` INT NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      INSERT INTO \`super_admins\` (\`user_id\`, \`is_active\`)
      SELECT \`id\`, 1 FROM \`users\`
      WHERE \`is_platform_admin\` = 1
      ON DUPLICATE KEY UPDATE \`is_active\` = VALUES(\`is_active\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`plans\`
      DROP COLUMN \`trial_days\`,
      DROP COLUMN \`max_tasks\`
    `);
    await queryRunner.query('DROP TABLE IF EXISTS `global_audit_logs`');
    await queryRunner.query('DROP TABLE IF EXISTS `impersonation_logs`');
    await queryRunner.query('DROP TABLE IF EXISTS `notification_logs`');
    await queryRunner.query('DROP TABLE IF EXISTS `tenant_usage`');
    await queryRunner.query('DROP TABLE IF EXISTS `platform_settings`');
    await queryRunner.query('DROP TABLE IF EXISTS `super_admins`');
  }
}

