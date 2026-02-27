import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrganizationIsArchived1760000007000 implements MigrationInterface {
  name = 'AddOrganizationIsArchived1760000007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'organizations'
        AND COLUMN_NAME = 'is_archived'
      LIMIT 1
    `);
    if (Array.isArray(hasColumn) && hasColumn.length > 0) return;

    await queryRunner.query(`
      ALTER TABLE \`organizations\`
      ADD COLUMN \`is_archived\` TINYINT(1) NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'organizations'
        AND COLUMN_NAME = 'is_archived'
      LIMIT 1
    `);
    if (Array.isArray(hasColumn) && hasColumn.length === 0) return;

    await queryRunner.query(`
      ALTER TABLE \`organizations\`
      DROP COLUMN \`is_archived\`
    `);
  }
}
