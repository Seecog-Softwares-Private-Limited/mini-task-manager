"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddTaskAssigneeIds1760000000000 = void 0;
class AddTaskAssigneeIds1760000000000 {
    constructor() {
        this.name = 'AddTaskAssigneeIds1760000000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE \`tasks\`
      ADD COLUMN \`assignee_ids\` TEXT NULL AFTER \`assignee_id\`
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE \`tasks\`
      DROP COLUMN \`assignee_ids\`
    `);
    }
}
exports.AddTaskAssigneeIds1760000000000 = AddTaskAssigneeIds1760000000000;
//# sourceMappingURL=1760000000000-AddTaskAssigneeIds.js.map