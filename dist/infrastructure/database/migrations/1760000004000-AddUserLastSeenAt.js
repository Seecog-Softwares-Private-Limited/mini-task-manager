"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddUserLastSeenAt1760000004000 = void 0;
class AddUserLastSeenAt1760000004000 {
    constructor() {
        this.name = 'AddUserLastSeenAt1760000004000';
    }
    async up(queryRunner) {
        const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'last_seen_at'
      LIMIT 1
    `);
        if (Array.isArray(hasColumn) && hasColumn.length > 0)
            return;
        await queryRunner.query(`
      ALTER TABLE \`users\`
      ADD COLUMN \`last_seen_at\` TIMESTAMP NULL AFTER \`is_active\`
    `);
    }
    async down(queryRunner) {
        const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'last_seen_at'
      LIMIT 1
    `);
        if (Array.isArray(hasColumn) && hasColumn.length === 0)
            return;
        await queryRunner.query(`
      ALTER TABLE \`users\`
      DROP COLUMN \`last_seen_at\`
    `);
    }
}
exports.AddUserLastSeenAt1760000004000 = AddUserLastSeenAt1760000004000;
//# sourceMappingURL=1760000004000-AddUserLastSeenAt.js.map