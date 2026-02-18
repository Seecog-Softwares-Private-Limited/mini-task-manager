"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddTaskSubtasks1760000001000 = void 0;
class AddTaskSubtasks1760000001000 {
    constructor() {
        this.name = 'AddTaskSubtasks1760000001000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE \`tasks\`
      ADD COLUMN \`subtasks\` TEXT NULL AFTER \`assignee_ids\`
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE \`tasks\`
      DROP COLUMN \`subtasks\`
    `);
    }
}
exports.AddTaskSubtasks1760000001000 = AddTaskSubtasks1760000001000;
//# sourceMappingURL=1760000001000-AddTaskSubtasks.js.map