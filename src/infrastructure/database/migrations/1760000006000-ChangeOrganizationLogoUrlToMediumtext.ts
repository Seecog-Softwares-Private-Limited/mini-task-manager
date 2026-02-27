import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeOrganizationLogoUrlToMediumtext1760000006000 implements MigrationInterface {
  name = 'ChangeOrganizationLogoUrlToMediumtext1760000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`organizations\`
      MODIFY COLUMN \`logo_url\` MEDIUMTEXT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`organizations\`
      MODIFY COLUMN \`logo_url\` VARCHAR(2048) NULL
    `);
  }
}
