"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddEmailVerificationShortCode1760000021000 = void 0;
class AddEmailVerificationShortCode1760000021000 {
    constructor() {
        this.name = 'AddEmailVerificationShortCode1760000021000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE \`email_verification_tokens\`
      ADD COLUMN \`short_code\` VARCHAR(6) NULL AFTER \`token\`,
      ADD UNIQUE KEY \`uq_email_verification_short_code\` (\`short_code\`)
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE \`email_verification_tokens\`
      DROP INDEX \`uq_email_verification_short_code\`,
      DROP COLUMN \`short_code\`
    `);
    }
}
exports.AddEmailVerificationShortCode1760000021000 = AddEmailVerificationShortCode1760000021000;
//# sourceMappingURL=1760000021000-AddEmailVerificationShortCode.js.map