import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectIconUrl1760000020000 implements MigrationInterface {
  name = 'AddProjectIconUrl1760000020000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('projects');
    if (!table?.findColumnByName('icon_url')) {
      return;
    }
    await queryRunner.query(`
      ALTER TABLE \`projects\` DROP COLUMN \`icon_url\`
    `);
  }
}
