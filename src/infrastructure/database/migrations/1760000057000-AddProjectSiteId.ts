import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Multi-industry phase 2: links a project to the site it belongs to.
 * Nullable - orgs that don't use sites (e.g. general/IT) leave it unset.
 */
export class AddProjectSiteId1760000057000 implements MigrationInterface {
  name = 'AddProjectSiteId1760000057000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'projects'
        AND COLUMN_NAME = 'site_id'
      LIMIT 1
    `);
    if (Array.isArray(hasColumn) && hasColumn.length > 0) return;

    await queryRunner.query(`
      ALTER TABLE \`projects\`
        ADD COLUMN \`site_id\` BINARY(16) NULL AFTER \`organization_id\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`projects\`
        ADD CONSTRAINT \`fk_projects_site\`
          FOREIGN KEY (\`site_id\`) REFERENCES \`sites\`(\`id\`) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX \`idx_projects_site\` ON \`projects\` (\`site_id\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`idx_projects_site\` ON \`projects\``);
    await queryRunner.query(`ALTER TABLE \`projects\` DROP FOREIGN KEY \`fk_projects_site\``);
    await queryRunner.query(`ALTER TABLE \`projects\` DROP COLUMN \`site_id\``);
  }
}
