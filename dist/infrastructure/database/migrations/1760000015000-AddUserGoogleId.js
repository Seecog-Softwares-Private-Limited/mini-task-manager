"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddUserGoogleId1760000015000 = void 0;
class AddUserGoogleId1760000015000 {
    constructor() {
        this.name = 'AddUserGoogleId1760000015000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE \`users\`
      ADD COLUMN \`google_id\` VARCHAR(64) NULL UNIQUE AFTER \`password_hash\`
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`google_id\``);
    }
}
exports.AddUserGoogleId1760000015000 = AddUserGoogleId1760000015000;
//# sourceMappingURL=1760000015000-AddUserGoogleId.js.map