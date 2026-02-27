import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Change organizations.owner_id FK from ON DELETE RESTRICT to ON DELETE CASCADE
 * so deleting a user cascades to their owned organizations (and those cascade
 * to org_members, projects, etc.).
 */
export class ChangeOrganizationsOwnerToCascade1760000017000 implements MigrationInterface {
  name = 'ChangeOrganizationsOwnerToCascade1760000017000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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

  public async down(queryRunner: QueryRunner): Promise<void> {
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
