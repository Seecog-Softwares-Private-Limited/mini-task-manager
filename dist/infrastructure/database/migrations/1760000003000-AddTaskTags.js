"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddTaskTags1760000003000 = void 0;
class AddTaskTags1760000003000 {
    constructor() {
        this.name = 'AddTaskTags1760000003000';
    }
    async up(queryRunner) {
        const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tasks'
        AND COLUMN_NAME = 'tags'
      LIMIT 1
    `);
        if (Array.isArray(hasColumn) && hasColumn.length > 0)
            return;
        await queryRunner.query(`
      ALTER TABLE \`tasks\`
      ADD COLUMN \`tags\` TEXT NULL AFTER \`sprint_id\`
    `);
    }
    async down(queryRunner) {
        const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tasks'
        AND COLUMN_NAME = 'tags'
      LIMIT 1
    `);
        if (Array.isArray(hasColumn) && hasColumn.length === 0)
            return;
        await queryRunner.query(`
      ALTER TABLE \`tasks\`
      DROP COLUMN \`tags\`
    `);
    }
}
exports.AddTaskTags1760000003000 = AddTaskTags1760000003000;
//# sourceMappingURL=1760000003000-AddTaskTags.js.map