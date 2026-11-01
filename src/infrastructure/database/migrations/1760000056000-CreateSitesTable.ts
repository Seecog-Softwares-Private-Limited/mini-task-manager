import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Multi-industry phase 2: a Site is the physical location a project belongs
 * to (a restaurant branch, a construction site, a hospital ward, a school
 * campus, a hotel property). Sits between Organization and Project.
 */
export class CreateSitesTable1760000056000 implements MigrationInterface {
  name = 'CreateSitesTable1760000056000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sites'
      LIMIT 1
    `);
    if (Array.isArray(exists) && exists.length > 0) return;

    await queryRunner.query(`
      CREATE TABLE \`sites\` (
        \`id\` BINARY(16) NOT NULL,
        \`organization_id\` BINARY(16) NOT NULL,
        \`name\` VARCHAR(200) NOT NULL,
        \`address\` TEXT NULL,
        \`is_archived\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`created_by\` BINARY(16) NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_sites_org_archived\` (\`organization_id\`, \`is_archived\`),
        CONSTRAINT \`fk_sites_organization\`
          FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_sites_created_by\`
          FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sites'
      LIMIT 1
    `);
    if (!Array.isArray(exists) || exists.length === 0) return;

    await queryRunner.query(`DROP TABLE \`sites\``);
  }
}
