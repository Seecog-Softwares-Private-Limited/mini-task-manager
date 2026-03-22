import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Change organizations.owner_id FK from ON DELETE RESTRICT to ON DELETE CASCADE
 * so deleting a user cascades to their owned organizations (and those cascade
 * to org_members, projects, etc.).
 *
 * Idempotent: resolves the actual FK name from information_schema (legacy DBs may
 * use InnoDB names like organizations_ibfk_2 instead of fk_organizations_owner).
 */
export class ChangeOrganizationsOwnerToCascade1760000017000 implements MigrationInterface {
  name = 'ChangeOrganizationsOwnerToCascade1760000017000';

  private async getOwnerUserFk(
    queryRunner: QueryRunner,
  ): Promise<{ constraintName: string; deleteRule: string } | null> {
    const rows = (await queryRunner.query(
      `
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
    `,
    )) as { constraintName: string; deleteRule: string }[];
    return rows[0] ?? null;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
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

    await queryRunner.query(
      `ALTER TABLE \`organizations\` DROP FOREIGN KEY \`${fk.constraintName}\``,
    );
    await queryRunner.query(`
      ALTER TABLE \`organizations\`
      ADD CONSTRAINT \`fk_organizations_owner\`
      FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const fk = await this.getOwnerUserFk(queryRunner);
    if (!fk) {
      return;
    }

    const rule = String(fk.deleteRule).toUpperCase();
    if (rule === 'RESTRICT' || rule === 'NO ACTION') {
      return;
    }

    await queryRunner.query(
      `ALTER TABLE \`organizations\` DROP FOREIGN KEY \`${fk.constraintName}\``,
    );
    await queryRunner.query(`
      ALTER TABLE \`organizations\`
      ADD CONSTRAINT \`fk_organizations_owner\`
      FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT
    `);
  }
}
