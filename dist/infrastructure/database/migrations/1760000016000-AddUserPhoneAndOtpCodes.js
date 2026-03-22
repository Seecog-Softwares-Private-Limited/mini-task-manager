"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddUserPhoneAndOtpCodes1760000016000 = void 0;
class AddUserPhoneAndOtpCodes1760000016000 {
    constructor() {
        this.name = 'AddUserPhoneAndOtpCodes1760000016000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE \`users\`
      ADD COLUMN \`phone\` VARCHAR(20) NULL UNIQUE AFTER \`google_id\`
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`otp_codes\` (
        \`id\` BINARY(16) NOT NULL,
        \`phone\` VARCHAR(20) NOT NULL,
        \`code\` VARCHAR(6) NOT NULL,
        \`expires_at\` TIMESTAMP NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_otp_phone\` (\`phone\`),
        KEY \`idx_otp_expires\` (\`expires_at\`)
      ) ENGINE=InnoDB
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS \`otp_codes\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`phone\``);
    }
}
exports.AddUserPhoneAndOtpCodes1760000016000 = AddUserPhoneAndOtpCodes1760000016000;
//# sourceMappingURL=1760000016000-AddUserPhoneAndOtpCodes.js.map