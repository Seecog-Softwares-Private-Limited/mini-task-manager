import { MigrationInterface, QueryRunner } from 'typeorm';

export class SaasRoadmapFeatures1760000033000 implements MigrationInterface {
  name = 'SaasRoadmapFeatures1760000033000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS saved_board_views (
        id BINARY(16) NOT NULL PRIMARY KEY,
        organization_id BINARY(16) NOT NULL,
        project_id BINARY(16) NULL,
        user_id BINARY(16) NOT NULL,
        name VARCHAR(120) NOT NULL,
        filters_json JSON NOT NULL,
        is_shared TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_saved_views_org_project (organization_id, project_id),
        INDEX idx_saved_views_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organization_webhooks (
        id BINARY(16) NOT NULL PRIMARY KEY,
        organization_id BINARY(16) NOT NULL,
        name VARCHAR(120) NOT NULL,
        url TEXT NOT NULL,
        secret VARCHAR(128) NOT NULL,
        events_json JSON NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_by BINARY(16) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_webhooks_org (organization_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS automation_rules (
        id BINARY(16) NOT NULL PRIMARY KEY,
        organization_id BINARY(16) NOT NULL,
        project_id BINARY(16) NULL,
        name VARCHAR(120) NOT NULL,
        trigger_type VARCHAR(64) NOT NULL,
        trigger_config_json JSON NULL,
        action_type VARCHAR(64) NOT NULL,
        action_config_json JSON NOT NULL,
        is_enabled TINYINT(1) NOT NULL DEFAULT 1,
        created_by BINARY(16) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_automation_org (organization_id),
        INDEX idx_automation_project (project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organization_integrations (
        id BINARY(16) NOT NULL PRIMARY KEY,
        organization_id BINARY(16) NOT NULL,
        provider VARCHAR(32) NOT NULL,
        label VARCHAR(120) NULL,
        access_token TEXT NULL,
        refresh_token TEXT NULL,
        config_json JSON NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        connected_by BINARY(16) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_org_integration_provider (organization_id, provider),
        INDEX idx_integrations_org (organization_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS task_time_entries (
        id BINARY(16) NOT NULL PRIMARY KEY,
        task_id BINARY(16) NOT NULL,
        organization_id BINARY(16) NOT NULL,
        user_id BINARY(16) NOT NULL,
        minutes INT NOT NULL,
        note VARCHAR(500) NULL,
        logged_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_time_entries_task (task_id),
        INDEX idx_time_entries_org_user (organization_id, user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organization_custom_roles (
        id BINARY(16) NOT NULL PRIMARY KEY,
        organization_id BINARY(16) NOT NULL,
        role_key VARCHAR(32) NOT NULL,
        label VARCHAR(64) NOT NULL,
        permissions_json JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_org_role_key (organization_id, role_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS organization_custom_roles`);
    await queryRunner.query(`DROP TABLE IF EXISTS task_time_entries`);
    await queryRunner.query(`DROP TABLE IF EXISTS organization_integrations`);
    await queryRunner.query(`DROP TABLE IF EXISTS automation_rules`);
    await queryRunner.query(`DROP TABLE IF EXISTS organization_webhooks`);
    await queryRunner.query(`DROP TABLE IF EXISTS saved_board_views`);
  }
}
