import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Multi-industry phase 1: lets a workspace pick an industry edition (see
 * src/modules/organizations/industry-packs.ts). Nullable - existing
 * workspaces resolve to the General edition's words until they set one.
 */
export class AddOrganizationIndustry1760000055000 implements MigrationInterface {
  name = 'AddOrganizationIndustry1760000055000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`organizations\`
        ADD COLUMN \`industry\` VARCHAR(30) NULL AFTER \`logo_url\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`organizations\` DROP COLUMN \`industry\``);
  }
}
