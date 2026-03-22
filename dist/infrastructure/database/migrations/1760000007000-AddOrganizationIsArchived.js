"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddOrganizationIsArchived1760000007000 = void 0;
class AddOrganizationIsArchived1760000007000 {
    constructor() {
        this.name = 'AddOrganizationIsArchived1760000007000';
    }
    async up(queryRunner) {
        const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'organizations'
        AND COLUMN_NAME = 'is_archived'
      LIMIT 1
    `);
        if (Array.isArray(hasColumn) && hasColumn.length > 0)
            return;
        await queryRunner.query(`
      ALTER TABLE \`organizations\`
      ADD COLUMN \`is_archived\` TINYINT(1) NOT NULL DEFAULT 0
    `);
    }
    async down(queryRunner) {
        const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'organizations'
        AND COLUMN_NAME = 'is_archived'
      LIMIT 1
    `);
        if (Array.isArray(hasColumn) && hasColumn.length === 0)
            return;
        await queryRunner.query(`
      ALTER TABLE \`organizations\`
      DROP COLUMN \`is_archived\`
    `);
    }
}
exports.AddOrganizationIsArchived1760000007000 = AddOrganizationIsArchived1760000007000;
//# sourceMappingURL=1760000007000-AddOrganizationIsArchived.js.map