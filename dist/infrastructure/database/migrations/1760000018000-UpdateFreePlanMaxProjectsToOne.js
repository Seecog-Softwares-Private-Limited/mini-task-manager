"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateFreePlanMaxProjectsToOne1760000018000 = void 0;
class UpdateFreePlanMaxProjectsToOne1760000018000 {
    constructor() {
        this.name = 'UpdateFreePlanMaxProjectsToOne1760000018000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      UPDATE \`plans\` SET \`max_projects\` = 1 WHERE \`slug\` = 'free'
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      UPDATE \`plans\` SET \`max_projects\` = 5 WHERE \`slug\` = 'free'
    `);
    }
}
exports.UpdateFreePlanMaxProjectsToOne1760000018000 = UpdateFreePlanMaxProjectsToOne1760000018000;
//# sourceMappingURL=1760000018000-UpdateFreePlanMaxProjectsToOne.js.map