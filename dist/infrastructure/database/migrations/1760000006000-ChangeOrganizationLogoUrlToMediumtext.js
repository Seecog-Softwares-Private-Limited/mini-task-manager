"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeOrganizationLogoUrlToMediumtext1760000006000 = void 0;
class ChangeOrganizationLogoUrlToMediumtext1760000006000 {
    constructor() {
        this.name = 'ChangeOrganizationLogoUrlToMediumtext1760000006000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE \`organizations\`
      MODIFY COLUMN \`logo_url\` MEDIUMTEXT NULL
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE \`organizations\`
      MODIFY COLUMN \`logo_url\` VARCHAR(2048) NULL
    `);
    }
}
exports.ChangeOrganizationLogoUrlToMediumtext1760000006000 = ChangeOrganizationLogoUrlToMediumtext1760000006000;
//# sourceMappingURL=1760000006000-ChangeOrganizationLogoUrlToMediumtext.js.map