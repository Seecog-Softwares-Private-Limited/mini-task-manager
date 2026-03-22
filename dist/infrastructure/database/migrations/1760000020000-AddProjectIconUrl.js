"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddProjectIconUrl1760000020000 = void 0;
class AddProjectIconUrl1760000020000 {
    constructor() {
        this.name = 'AddProjectIconUrl1760000020000';
    }
    async up(queryRunner) {
        const table = await queryRunner.getTable('projects');
        if (table?.findColumnByName('icon_url')) {
            return;
        }
        await queryRunner.query(`
      ALTER TABLE \`projects\`
      ADD COLUMN \`icon_url\` MEDIUMTEXT NULL
      AFTER \`description\`
    `);
    }
    async down(queryRunner) {
        const table = await queryRunner.getTable('projects');
        if (!table?.findColumnByName('icon_url')) {
            return;
        }
        await queryRunner.query(`
      ALTER TABLE \`projects\` DROP COLUMN \`icon_url\`
    `);
    }
}
exports.AddProjectIconUrl1760000020000 = AddProjectIconUrl1760000020000;
//# sourceMappingURL=1760000020000-AddProjectIconUrl.js.map