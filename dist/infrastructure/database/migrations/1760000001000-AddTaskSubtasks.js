"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddTaskSubtasks1760000001000 = void 0;
class AddTaskSubtasks1760000001000 {
    constructor() {
        this.name = 'AddTaskSubtasks1760000001000';
    }
    async up(queryRunner) {
        const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tasks'
        AND COLUMN_NAME = 'subtasks'
      LIMIT 1
    `);
        if (hasColumn.length > 0)
            return;
        await queryRunner.query(`
      ALTER TABLE \`tasks\`
      ADD COLUMN \`subtasks\` TEXT NULL AFTER \`assignee_ids\`
    `);
    }
    async down(queryRunner) {
        const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tasks'
        AND COLUMN_NAME = 'subtasks'
      LIMIT 1
    `);
        if (hasColumn.length === 0)
            return;
        await queryRunner.query(`
      ALTER TABLE \`tasks\`
      DROP COLUMN \`subtasks\`
    `);
    }
}
exports.AddTaskSubtasks1760000001000 = AddTaskSubtasks1760000001000;
//# sourceMappingURL=1760000001000-AddTaskSubtasks.js.map