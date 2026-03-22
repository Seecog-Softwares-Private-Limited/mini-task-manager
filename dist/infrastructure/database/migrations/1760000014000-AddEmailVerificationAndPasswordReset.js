"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddEmailVerificationAndPasswordReset1760000014000 = void 0;
class AddEmailVerificationAndPasswordReset1760000014000 {
    constructor() {
        this.name = 'AddEmailVerificationAndPasswordReset1760000014000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`email_verification_tokens\` (
        \`id\` BINARY(16) NOT NULL,
        \`user_id\` BINARY(16) NOT NULL,
        \`token\` VARCHAR(64) NOT NULL,
        \`expires_at\` TIMESTAMP NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_email_verification_token\` (\`token\`),
        KEY \`idx_email_verification_user\` (\`user_id\`),
        CONSTRAINT \`fk_email_verification_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`password_reset_tokens\` (
        \`id\` BINARY(16) NOT NULL,
        \`user_id\` BINARY(16) NOT NULL,
        \`token\` VARCHAR(64) NOT NULL,
        \`expires_at\` TIMESTAMP NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_password_reset_token\` (\`token\`),
        KEY \`idx_password_reset_user\` (\`user_id\`),
        CONSTRAINT \`fk_password_reset_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS \`password_reset_tokens\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`email_verification_tokens\``);
    }
}
exports.AddEmailVerificationAndPasswordReset1760000014000 = AddEmailVerificationAndPasswordReset1760000014000;
//# sourceMappingURL=1760000014000-AddEmailVerificationAndPasswordReset.js.map