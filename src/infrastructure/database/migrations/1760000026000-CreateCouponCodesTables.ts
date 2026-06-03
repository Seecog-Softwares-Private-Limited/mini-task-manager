import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCouponCodesTables1760000026000 implements MigrationInterface {
  name = 'CreateCouponCodesTables1760000026000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`plan_configurations\`
      ADD COLUMN \`allow_coupon\` TINYINT(1) NOT NULL DEFAULT 0
      AFTER \`max_workspaces\`
    `);

    await queryRunner.query(`
      UPDATE \`plan_configurations\`
      SET \`allow_coupon\` = 1
      WHERE \`plan_name\` IN ('silver', 'gold')
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`coupon_codes\` (
        \`id\` BINARY(16) NOT NULL,
        \`code\` VARCHAR(40) NOT NULL,
        \`discount_percent\` TINYINT UNSIGNED NOT NULL,
        \`applicable_plans\` JSON NOT NULL,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`max_redemptions\` INT UNSIGNED NULL,
        \`redemption_count\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`expires_at\` TIMESTAMP NULL,
        \`created_by\` BINARY(16) NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`ux_coupon_codes_code\` (\`code\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_coupon_codes_created_by\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`coupon_redemptions\` (
        \`id\` BINARY(16) NOT NULL,
        \`coupon_id\` BINARY(16) NOT NULL,
        \`user_id\` BINARY(16) NOT NULL,
        \`plan_name\` VARCHAR(20) NOT NULL,
        \`discount_percent\` TINYINT UNSIGNED NOT NULL,
        \`original_amount_inr\` DECIMAL(10,2) NOT NULL,
        \`final_amount_inr\` DECIMAL(10,2) NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_coupon_redemptions_coupon\` (\`coupon_id\`),
        KEY \`idx_coupon_redemptions_user\` (\`user_id\`),
        CONSTRAINT \`fk_coupon_redemptions_coupon\` FOREIGN KEY (\`coupon_id\`) REFERENCES \`coupon_codes\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_coupon_redemptions_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `coupon_redemptions`');
    await queryRunner.query('DROP TABLE IF EXISTS `coupon_codes`');
    await queryRunner.query(`
      ALTER TABLE \`plan_configurations\` DROP COLUMN \`allow_coupon\`
    `);
  }
}
