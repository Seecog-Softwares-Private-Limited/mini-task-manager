"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeOrganizationsOwnerToCascade1760000017000 = void 0;
class ChangeOrganizationsOwnerToCascade1760000017000 {
    constructor() {
        this.name = 'ChangeOrganizationsOwnerToCascade1760000017000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE \`organizations\`
      DROP FOREIGN KEY \`fk_organizations_owner\`
    `);
        await queryRunner.query(`
      ALTER TABLE \`organizations\`
      ADD CONSTRAINT \`fk_organizations_owner\`
      FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE \`organizations\`
      DROP FOREIGN KEY \`fk_organizations_owner\`
    `);
        await queryRunner.query(`
      ALTER TABLE \`organizations\`
      ADD CONSTRAINT \`fk_organizations_owner\`
      FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT
    `);
    }
}
exports.ChangeOrganizationsOwnerToCascade1760000017000 = ChangeOrganizationsOwnerToCascade1760000017000;
//# sourceMappingURL=1760000017000-ChangeOrganizationsOwnerToCascade.js.map