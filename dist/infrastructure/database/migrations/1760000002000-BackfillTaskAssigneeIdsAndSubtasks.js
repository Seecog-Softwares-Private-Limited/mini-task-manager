"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackfillTaskAssigneeIdsAndSubtasks1760000002000 = void 0;
class BackfillTaskAssigneeIdsAndSubtasks1760000002000 {
    constructor() {
        this.name = 'BackfillTaskAssigneeIdsAndSubtasks1760000002000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      UPDATE \`tasks\`
      SET \`assignee_ids\` = JSON_ARRAY(BIN_TO_UUID(\`assignee_id\`))
      WHERE \`assignee_id\` IS NOT NULL
        AND (\`assignee_ids\` IS NULL OR \`assignee_ids\` = '')
    `);
    }
    async down(_queryRunner) {
    }
}
exports.BackfillTaskAssigneeIdsAndSubtasks1760000002000 = BackfillTaskAssigneeIdsAndSubtasks1760000002000;
//# sourceMappingURL=1760000002000-BackfillTaskAssigneeIdsAndSubtasks.js.map