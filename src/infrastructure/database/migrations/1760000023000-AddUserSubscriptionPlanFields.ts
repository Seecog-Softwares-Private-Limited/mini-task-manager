import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSubscriptionPlanFields1760000023000 implements MigrationInterface {
  name = 'AddUserSubscriptionPlanFields1760000023000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
        ADD COLUMN \`current_plan\` VARCHAR(20) NOT NULL DEFAULT 'free',
        ADD COLUMN \`plan_started_at\` TIMESTAMP NULL,
        ADD COLUMN \`plan_expires_at\` TIMESTAMP NULL,
        ADD COLUMN \`storage_used\` BIGINT NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
        DROP COLUMN \`storage_used\`,
        DROP COLUMN \`plan_expires_at\`,
        DROP COLUMN \`plan_started_at\`,
        DROP COLUMN \`current_plan\`
    `);
  }
}
