"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddOrganizationLogoUrl1760000005000 = void 0;
class AddOrganizationLogoUrl1760000005000 {
    constructor() {
        this.name = 'AddOrganizationLogoUrl1760000005000';
    }
    async up(queryRunner) {
        const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'organizations'
        AND COLUMN_NAME = 'logo_url'
      LIMIT 1
    `);
        if (Array.isArray(hasColumn) && hasColumn.length > 0)
            return;
        await queryRunner.query(`
      ALTER TABLE \`organizations\`
      ADD COLUMN \`logo_url\` VARCHAR(2048) NULL AFTER \`slug\`
    `);
    }
    async down(queryRunner) {
        const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'organizations'
        AND COLUMN_NAME = 'logo_url'
      LIMIT 1
    `);
        if (Array.isArray(hasColumn) && hasColumn.length === 0)
            return;
        await queryRunner.query(`
      ALTER TABLE \`organizations\`
      DROP COLUMN \`logo_url\`
    `);
    }
}
exports.AddOrganizationLogoUrl1760000005000 = AddOrganizationLogoUrl1760000005000;
//# sourceMappingURL=1760000005000-AddOrganizationLogoUrl.js.map