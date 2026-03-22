"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddUserOnboardingCompletedAt1760000008000 = void 0;
class AddUserOnboardingCompletedAt1760000008000 {
    constructor() {
        this.name = 'AddUserOnboardingCompletedAt1760000008000';
    }
    async up(queryRunner) {
        const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'onboarding_completed_at'
      LIMIT 1
    `);
        if (Array.isArray(hasColumn) && hasColumn.length > 0)
            return;
        await queryRunner.query(`
      ALTER TABLE \`users\`
      ADD COLUMN \`onboarding_completed_at\` TIMESTAMP NULL
    `);
    }
    async down(queryRunner) {
        const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'onboarding_completed_at'
      LIMIT 1
    `);
        if (Array.isArray(hasColumn) && hasColumn.length === 0)
            return;
        await queryRunner.query(`
      ALTER TABLE \`users\`
      DROP COLUMN \`onboarding_completed_at\`
    `);
    }
}
exports.AddUserOnboardingCompletedAt1760000008000 = AddUserOnboardingCompletedAt1760000008000;
//# sourceMappingURL=1760000008000-AddUserOnboardingCompletedAt.js.map