"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddSSOConfigAndPlanUpgrade1760000010000 = void 0;
class AddSSOConfigAndPlanUpgrade1760000010000 {
    constructor() {
        this.name = 'AddSSOConfigAndPlanUpgrade1760000010000';
    }
    async up(queryRunner) {
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
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS \`sso_configs\``);
    }
}
exports.AddSSOConfigAndPlanUpgrade1760000010000 = AddSSOConfigAndPlanUpgrade1760000010000;
//# sourceMappingURL=1760000010000-AddSSOConfigAndPlanUpgrade.js.map