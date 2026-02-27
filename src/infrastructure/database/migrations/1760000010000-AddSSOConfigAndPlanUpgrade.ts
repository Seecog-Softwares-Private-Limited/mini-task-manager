import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSSOConfigAndPlanUpgrade1760000010000 implements MigrationInterface {
  name = 'AddSSOConfigAndPlanUpgrade1760000010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create sso_configs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`sso_configs\` (
        \`id\` BINARY(16) NOT NULL,
        \`organization_id\` BINARY(16) NOT NULL,
        \`provider\` VARCHAR(20) NOT NULL COMMENT 'SAML or OIDC',
        \`label\` VARCHAR(150) NULL,
        \`issuer_url\` TEXT NULL,
        \`sso_url\` TEXT NULL,
        \`client_id\` VARCHAR(255) NULL,
        \`client_secret\` VARCHAR(512) NULL,
        \`certificate\` TEXT NULL,
        \`metadata_url\` TEXT NULL,
        \`domains\` VARCHAR(500) NULL,
        \`is_enabled\` TINYINT(1) NOT NULL DEFAULT 0,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`idx_sso_configs_organization_id\` (\`organization_id\`),
        CONSTRAINT \`fk_sso_configs_org\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`sso_configs\``);
  }
}
