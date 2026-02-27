import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Update free tier max_projects from 5 (or 2) to 1.
 */
export class UpdateFreePlanMaxProjectsToOne1760000018000 implements MigrationInterface {
  name = 'UpdateFreePlanMaxProjectsToOne1760000018000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`plans\` SET \`max_projects\` = 1 WHERE \`slug\` = 'free'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`plans\` SET \`max_projects\` = 5 WHERE \`slug\` = 'free'
    `);
  }
}
