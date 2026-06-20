import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlanPriceMonthlyInr1760000033000 implements MigrationInterface {
  name = 'AddPlanPriceMonthlyInr1760000033000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`plan_configurations\`
      ADD COLUMN \`price_monthly_inr\` INT UNSIGNED NOT NULL DEFAULT 0
      AFTER \`allow_coupon\`
    `);

    await queryRunner.query(`
      UPDATE \`plan_configurations\`
      SET \`price_monthly_inr\` = CASE \`plan_name\`
        WHEN 'free' THEN 0
        WHEN 'silver' THEN 500
        WHEN 'gold' THEN 1000
        ELSE 0
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`plan_configurations\` DROP COLUMN \`price_monthly_inr\`
    `);
  }
}
