"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeOrganizationsOwnerToCascade1760000017000 = void 0;
class ChangeOrganizationsOwnerToCascade1760000017000 {
    constructor() {
        this.name = 'ChangeOrganizationsOwnerToCascade1760000017000';
    }
    async getOwnerUserFk(queryRunner) {
        const rows = (await queryRunner.query(`
      SELECT rc.CONSTRAINT_NAME AS constraintName, rc.DELETE_RULE AS deleteRule
      FROM information_schema.REFERENTIAL_CONSTRAINTS rc
      INNER JOIN information_schema.KEY_COLUMN_USAGE kcu
        ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
        AND rc.TABLE_NAME = kcu.TABLE_NAME
        AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
      WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
        AND rc.TABLE_NAME = 'organizations'
        AND kcu.COLUMN_NAME = 'owner_id'
        AND kcu.REFERENCED_TABLE_NAME = 'users'
      LIMIT 1
    `));
        return rows[0] ?? null;
    }
    async up(queryRunner) {
        const fk = await this.getOwnerUserFk(queryRunner);
        if (!fk) {
            await queryRunner.query(`
        ALTER TABLE \`organizations\`
        ADD CONSTRAINT \`fk_organizations_owner\`
        FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      `);
            return;
        }
        if (String(fk.deleteRule).toUpperCase() === 'CASCADE') {
            return;
        }
        await queryRunner.query(`ALTER TABLE \`organizations\` DROP FOREIGN KEY \`${fk.constraintName}\``);
        await queryRunner.query(`
      ALTER TABLE \`organizations\`
      ADD CONSTRAINT \`fk_organizations_owner\`
      FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    `);
    }
    async down(queryRunner) {
        const fk = await this.getOwnerUserFk(queryRunner);
        if (!fk) {
            return;
        }
        const rule = String(fk.deleteRule).toUpperCase();
        if (rule === 'RESTRICT' || rule === 'NO ACTION') {
            return;
        }
        await queryRunner.query(`ALTER TABLE \`organizations\` DROP FOREIGN KEY \`${fk.constraintName}\``);
        await queryRunner.query(`
      ALTER TABLE \`organizations\`
      ADD CONSTRAINT \`fk_organizations_owner\`
      FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT
    `);
    }
}
exports.ChangeOrganizationsOwnerToCascade1760000017000 = ChangeOrganizationsOwnerToCascade1760000017000;
//# sourceMappingURL=1760000017000-ChangeOrganizationsOwnerToCascade.js.map